import { useEffect } from "react";
import { useReactMediaRecorder } from "react-media-recorder";

const MediaRecorder = ({
  customStream,
  recording,
  resultSetter,
}: {
  customStream: MediaStream;
  recording: boolean;
  resultSetter: (blobUrl: string) => void;
}) => {
  const { status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({
      video: true,
      audio: false,
      customMediaStream: customStream,
    });

  useEffect(() => {
    console.log("recording", recording);
    if (recording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [recording, startRecording, stopRecording]);

  useEffect(() => {
    if (status === "stopped" && mediaBlobUrl) {
      resultSetter(mediaBlobUrl);
    }
  }, [status, mediaBlobUrl, resultSetter]);

  return <></>;
};

export default MediaRecorder;
