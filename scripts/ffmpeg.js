let ffmpegEncoder = function (encoderArgs, files) {
    let stdout = "";
    let stderr = "";

    // Hosted ffmpeg worker file in a different domain
    const webWorkerURL = "https://raw.githubusercontent.com/StormRaider2495/video-trimming/master/scripts/ffmpeg-worker-mp4.js";
    let worker;
    fetch(webWorkerURL)
        .then(res => res.blob()) // Gets the response and returns it as a blob
        .then(blob => {
            const webWorkerBlobURL = window.URL.createObjectURL(blob);
            worker = new Worker(webWorkerBlobURL);

            worker.onmessage = function (e) {
                var msg = e.data;
                console.log(msg.type, msg.data)
                switch (msg.type) {
                    case "ready":
                        globalResolve();
                        break;
                    case "stdout":
                        if (this.stderr) this.stderr(msg);
                        stdout += msg.data + "\n";
                        break;
                    case "stderr":
                        if (this.stderr) this.stderr(msg);
                        stderr += msg.data + "\n";
                        break;
                    case "done":
                        videoResolve(msg.data);
                        worker.terminate();
                        console.log("done");
                        break;
                    case "exit":
                        console.log("Process exited with code " + msg.data);
                        console.log(stderr);
                        console.log(stdout);
                        break;
                }
            }.bind(this);
        });
    // const webWorkerBlob = new Blob([webWorker], { type: "application/javascript" });
    // const webWorkerBlobURL = window.URL.createObjectURL(webWorkerBlob);
    // let worker = new Worker(webWorkerBlobURL);

    let globalResolve;
    let videoResolve;

    function loadFile(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                resolve(e.target.result);
            };
            fileReader.readAsArrayBuffer(file);
        });
    }

    this.ready = new Promise(function (resolve, reject) {
        globalResolve = resolve;
    });

    this.videoReady = new Promise(function (resolve, reject) {
        videoResolve = resolve;
    });

    this.reset = function () {
        this.videoReady = new Promise(function (resolve, reject) {
            videoResolve = resolve;
        });
    }.bind(this);

    this.run = function (files, startTime, endTime) {
        let args = ['-y']
            .concat((encoderArgs || []))
            .concat((startTime !== undefined) ? ['-ss', startTime] : [])
            .concat(['-i', files[0].name])
            .concat((endTime !== undefined) ? ['-to', endTime] : [])
            .concat(['output.mp4'])
            .concat(['-c:v copy'])
            .concat(['-c:a copy']);

        console.log(args);

        const idealheap = 1024 * 1024 * 1024;

        worker.postMessage({
            type: "run",
            arguments: args,
            TOTAL_MEMORY: idealheap,
            MEMFS: files
        });
    };
};
