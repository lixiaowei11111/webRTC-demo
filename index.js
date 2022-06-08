let mediaRecorder;
let recordedBlobs; // 录制下来的内容
let isRecording = false;

// 先把页面元素拿到
const startCameraBtn = document.querySelector("button#startCamera"); // 启动摄像头按钮
const stopCameraBtn = document.querySelector("button#stopCamera");
const recordBtn = document.querySelector("button#record"); // 开始录制按钮
const playBtn = document.querySelector("button#play"); // 播放按钮
const downloadBtn = document.querySelector("button#download"); // 下载视频按钮
const codecSelector = document.querySelector("#codecSelect"); // 选择格式
const msgEle = document.querySelector("span#msg"); // 显示消息
const previewV1 = document.querySelector("video#v1"); // 预览用的
const recordedV2 = document.querySelector("video#v2"); // 用来播放录制好的视频

function getSupportedMimeTypes() {
  const possibleTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264,opus",
    "video/mp4;codecs=h264,aac",
  ];
  return possibleTypes.filter((mimeType) => {
    return MediaRecorder.isTypeSupported(mimeType);
  });
}
// 启动摄像头
startCameraBtn.addEventListener("click", async () => {
  startCameraBtn.disabled = true;
  const isEchoCancellation =
    document.querySelector("#echoCancellation").checked;
  const constraints = {
    audio: {
      echoCancellation: { exact: isEchoCancellation },
    },
    video: {
      width: 1280,
      height: 720,
    },
  };
  await init(constraints);
});

async function init(constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    gotStream(stream);
  } catch (e) {
    showMsg(`navigator.getUserMedia error:${e.toString()}`);
  }
}

function gotStream(stream) {
  recordBtn.disabled = false;
  showMsg("拿到了 stream:", stream);
  window.stream = stream;
  previewV1.srcObject = stream;

  // 重置
  var codecOption = codecSelector.lastChild;
  while (codecOption != null) {
    codecSelector.removeChild(codecOption);
    codecOption = codecSelector.lastChild;
  }

  getSupportedMimeTypes().forEach((mimeType) => {
    const option = document.createElement("option");
    option.value = mimeType;
    option.innerText = option.value;
    codecSelector.appendChild(option);
  });
  codecSelector.disabled = false; // 可以进行选择了
}
stopCameraBtn.addEventListener("click", () => {
  var stream = previewV1.srcObject;
  if (stream == null) {
    return;
  }
  const tracks = stream.getTracks();
  tracks.forEach(function (track) {
    track.stop();
  });
  previewV1.srcObject = null;
  window.stream = null;
  codecSelector.disabled = true;
  startCameraBtn.disabled = false;
});

function startRecording() {
  recordedBlobs = [];
  const mimeType = codecSelector.options[codecSelector.selectedIndex].value;
  const options = { mimeType };

  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    showMsg(`创建MediaRecorder出错: ${JSON.stringify(e)}`);
    return;
  }

  showMsg("创建MediaRecorder", mediaRecorder, " -> options", options);
  recordBtn.textContent = "停止录制";
  isRecording = true;
  playBtn.disabled = true;
  downloadBtn.disabled = true;
  codecSelector.disabled = true;
  mediaRecorder.onstop = (event) => {
    showMsg("录制停止了: " + event);
    showMsg("录制的数据Blobs: " + recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  showMsg("录制开始 mediaRecorder: " + mediaRecorder);
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

recordBtn.addEventListener("click", () => {
  if (isRecording == false) {
    startRecording();
  } else {
    stopRecording();
    recordBtn.textContent = "开始录制";
    playBtn.disabled = false;
    downloadBtn.disabled = false;
    codecSelector.disabled = false;
  }
});

function stopRecording() {
  mediaRecorder.stop();
}

playBtn.addEventListener("click", () => {
  const mimeType = codecSelector.options[
    codecSelector.selectedIndex
  ].value.split(";", 1)[0];
  const superBuffer = new Blob(recordedBlobs, { type: mimeType });
  recordedV2.src = null;
  recordedV2.srcObject = null;
  recordedV2.src = window.URL.createObjectURL(superBuffer);
  recordedV2.controls = true;
  recordedV2.play();
});

downloadBtn.addEventListener("click", () => {
  const blob = new Blob(recordedBlobs, { type: "video/webm" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = "视频_" + new Date().getTime() + ".webm";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
});
