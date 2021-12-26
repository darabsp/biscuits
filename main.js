// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// the link to your model provided by Teachable Machine export panel
const URL = "./my_model/";

let model, webcam, maxPredictions;
let isErrorOccurred = false;
let isCameraReady = false, isCameraPlay = false;

let controlButton = document.getElementById("control-button");
let webcamContainer = document.getElementById("webcam-container");
let outputContainer = document.getElementById("output-container");
let errorContainer = document.getElementById("error-container");
let answerContainer = document.getElementById("answer-container");
let labelContainer = document.getElementById("label-container");

// Load the image model and setup the webcam
async function init() {
    try {
        if (isErrorOccurred) {
            isErrorOccurred = false;
            outputContainer.style.backgroundColor = "";
            errorContainer.remove();
        }

        controlButton.setAttribute("disabled");

        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        if (!isCameraReady) {
            // load the model and metadata
            // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
            // or files from your local hard drive
            // Note: the pose library adds "tmImage" object to your window (window.tmImage)
            model = await tmImage.load(modelURL, metadataURL);
            maxPredictions = model.getTotalClasses();

            // Convenience function to setup a webcam
            const flip = true; // whether to flip the webcam
            webcam = new tmImage.Webcam(320, 320, flip); // width, height, flip
            await webcam.setup()
                .then(
                    function() {
                        isCameraReady = true;
                    }
                ).catch(
                    function(reason) {
                        throw "Webカメラのセットアップに失敗しました。" + "(" + reason + ")";
                    }
                ); // request access to the webcam
            await webcam.play()
                .then(
                    function() {
                        isCameraPlay = true;
                        controlButton.textContent = "一時停止";
                    }
                ).catch(
                    function(reason) {
                        throw "Webカメラを動作開始できませんでした。(" + reason + ")";
                    }
                );

            // append elements to the DOM
            webcamContainer.appendChild(webcam.canvas);
            for (let i = 0; i < maxPredictions; i++) { // and class labels
                labelContainer.appendChild(document.createElement("li"));
            }
        } else if (isCameraReady && !isCameraPlay) {
            await webcam.play()
                .then(
                    function() {
                        isCameraPlay = true;
                        controlButton.textContent = "一時停止";
                    }
                ).catch(
                    function(reason) {
                        throw "Webカメラを動作開始できませんでした。(" + reason + ")";
                    }
                );
        } else if (isCameraReady && isCameraPlay) {
            await webcam.pause();
            isCameraPlay = false;
            controlButton.textContent = "再開";
            /*
            .then(
                function(){
                    isCameraPlay = false;
                }
            ).catch(
                function(reason){
                    throw "Webカメラを動作停止できませんでした。(" + reason + ")";
                }
            )*/
        }

        window.requestAnimationFrame(loop);

    } catch (error) {
        isErrorOccurred = true;
        if (typeof error === "undefined") {
            error = "エラーが発生しました。(undefined)";
        }
        console.error(error);
        outputContainer.style.backgroundColor = "var(--error-color-transparent)";
        let newErrorContainer = document.createElement("p");
        newErrorContainer.id = "error-container";
        outputContainer.insertBefore(newErrorContainer, outputContainer.firstChild);
        errorContainer.textContent = error;
    } finally {
        controlButton.removeAttribute("disabled");
    }
}

async function loop() {
    webcam.update(); // update the webcam frame
    let prediction = await predict();
    if (typeof debug === "undefined") { console.log(prediction); console.table(prediction); debug = true; }
    let bestPredictionIndex = 0, bestPredictionProbability = 0;
    for (let i = 0; i < prediction.length; i++) {
        if (prediction[i].probability > bestPredictionProbability) {
            bestPredictionIndex = i;
            bestPredictionProbability = prediction[i].probability;
        }
    };
    let bestClass = prediction[bestPredictionIndex].className, bestProbability = prediction[bestPredictionIndex].probability * 100;
    let firstSentence = "このお菓子は「" + bestClass + "」でしょう。";
    let secondSentence = "確率は" + bestProbability.toFixed(1) + "%です。"
    answerContainer.innerHTML = firstSentence + "<br>" + secondSentence;
    window.requestAnimationFrame(loop);
}

// run the webcam image through the image model
async function predict() {
    // predict can take in an image, video or canvas html element
    const prediction = await model.predict(webcam.canvas);
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + (prediction[i].probability * 100).toFixed(1) + "%";
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }
    return prediction;
}
