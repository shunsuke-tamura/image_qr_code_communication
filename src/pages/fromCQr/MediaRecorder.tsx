import { useEffect } from "react";
import { useReactMediaRecorder } from "react-media-recorder";

const MediaRecorder = ({
  customStream,
  // width,
  // height,
  recording,
  resultSetter,
}: {
  customStream: MediaStream;
  // width: number;
  // height: number;
  recording: boolean;
  resultSetter: (blobUrl: string) => void;
}) => {
  const { status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({
      video: {
        width: {
          exact: customStream.getVideoTracks()[0].getSettings().width,
        },
        height: {
          exact: customStream.getVideoTracks()[0].getSettings().height,
        },
      },
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
  }, [recording]);

  useEffect(() => {
    if (status === "stopped" && mediaBlobUrl) {
      resultSetter(mediaBlobUrl);
    }
  }, [status, mediaBlobUrl, resultSetter]);

  return <></>;
};

export default MediaRecorder;
