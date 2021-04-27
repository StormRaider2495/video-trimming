// Used for caching the script files 
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => {
      console.log('installed');
    })
}

const ffmpeg = new ffmpegEncoder();

let fileInput;
let startTimeEl;
let endTimeEl;
let trimBtn;
let currentFile;
let inputVideo = document.getElementById('inputVideo');

let loadFile = function(file) {
  return new Promise(function(resolve, reject) {
    const fileReader = new FileReader();
    fileReader.onload = function(e) {
      resolve(this.result);
    };
    fileReader.readAsArrayBuffer(file);
  });
};

const secondsToTimeCode = function(timeInSeconds) {

  function pad(number) {
      return (number <= 9) ? '0' + number : number;
  }

  const hours = Math.floor(timeInSeconds / 3600)
  const minutes = Math.floor((timeInSeconds - (hours * 3600)) / 60) % 60;
  const seconds = timeInSeconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const timeCodeToSeconds = function(timeCode) {
  let timeParts = timeCode.split(':');

  return (parseFloat(timeParts[2])
          + parseInt(timeParts[1] * 60)
          + parseInt (timeParts[0] * 3600));
};

const prepare = function(file) {
  document.body.classList.add('picking');
  let urlToVideo = URL.createObjectURL(file);
  inputVideo = document.getElementById('inputVideo');
  inputVideo.onloadedmetadata = function() {
    endTimeEl.value = secondsToTimeCode(inputVideo.duration);
  };
  inputVideo.ondurationchange = function() {
    endTimeEl.value = secondsToTimeCode(inputVideo.duration);
  };
  console.log('before')
  inputVideo.src = urlToVideo;
  console.log(inputVideo)
};

const start = function(file, startTime, endTime) {
  ffmpeg.reset();
  document.body.classList.add('working');

  ffmpeg.videoReady.then(function(data) {
    // the video has completed processing
    console.log("Video trimming done");
    document.body.classList.remove('working');
    var buffer = data.MEMFS[0].data;
    const trimmedVideoBlob = new Blob( [ buffer ], { type: "video/mp4" } );
    console.log("Video trimming done");
    console.log("--- Video url ", trimmedVideoBlob);
    download(trimmedVideoBlob);
  });

  const logEl = document.getElementById('log');
  logEl.innerText = '';

  ffmpeg.stderr = function(msg) {
    logEl.innerText += msg.data + "\n";
    logEl.scrollTop = logEl.scrollHeight;
  };

  ffmpeg.ready.then(function() {
    //the framework is ready
    console.log('getting ready');
    return loadFile(file);
  })
  .then(function(arrayBuffer) {
    // We have the file that the user has input, now load the
    console.log('ready to run');
    ffmpeg.run([
      {name: file.name, data: arrayBuffer}
      ],
      startTime,
      endTime
    );
  });
};

const startExternal = (file, startTime, endTime) => {
  currentFile = file;
  prepare(file);
}

Comlink.expose(startExternal, window);

const selectTime = function(e) {
  var element = e.target;
  startTimeEl.classList.remove('editing');
  endTimeEl.classList.remove('editing');

  element.classList.add('editing');
  // Position the video to the current time
  inputVideo.currentTime = timeCodeToSeconds(element.value);
  // Only one text box will
  inputVideo.ontimeupdate = function() {
    element.value = secondsToTimeCode(inputVideo.currentTime);
  };
};

const updateTime = function(e) {
  var element = e.target;
  // Position the video to the current time
  inputVideo.currentTime = timeCodeToSeconds(element.value);
};

const validateStartLessThanEndTimes = function() {
  const start = timeCodeToSeconds(startTimeEl.value);
  const end = timeCodeToSeconds(endTimeEl.value);

  return (start < end);
};

const validateWithingConstrains = function(element) {
  const seconds = timeCodeToSeconds(element.value);
  return (seconds >= 0 && seconds <= inputVideo.duration);
};

onload = function() {
  ffmpeg.ready.then(function() {
    document.body.classList.remove('loading');
  });

  fileInput = document.getElementById("videoFile");
  fileInput.onchange = function(e) {
    currentFile = e.target.files[0];
    prepare(currentFile);
  };

  startTimeEl = document.getElementById("startTime");
  endTimeEl = document.getElementById("endTime");
  trimBtn = document.getElementById("trim");

  startTimeEl.addEventListener('click', selectTime);
  endTimeEl.addEventListener('click', selectTime);

  startTimeEl.addEventListener('change', updateTime);
  endTimeEl.addEventListener('change', updateTime);

  trimBtn.addEventListener("click", function() {
    start(currentFile, startTimeEl.value, endTimeEl.value);
  });
};

function download(blob) {
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.mp4';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

ondragover = function(e) {
  if (e.preventDefault) {
    e.preventDefault(); // Necessary. Allows us to drop.
  }

  if(e.dataTransfer.items[0].type.indexOf('video/') != 0
      && e.dataTransfer.files[0].type.indexOf('video/') !=0) {
    document.body.classList.add('badfile');
    return false;
  }

  document.body.classList.add('goodfile');

  e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

  return false;
}

ondragleave = function() {
  document.body.classList.remove('goodfile');
  document.body.classList.remove('badfile');
}

ondragend= function() {
  document.body.classList.remove('goodfile');
  document.body.classList.remove('badfile');
}

const outputBuffer = new ArrayBuffer();

ondrop = function(e) {
  if (e.stopPropagation) {
    e.stopPropagation(); // stops the browser from redirecting.
  }

  document.body.classList.remove('badfile');
  document.body.classList.remove('goodfile');

  if(e.dataTransfer.items[0].type.indexOf('video/') != 0) {
    return false;
  }

  currentFile = e.dataTransfer.files[0];
  prepare(currentFile);

  return false;
};