import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [transcription, setTranscription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [ws, setWs] = useState(null);
  let mediaRecorder;

  useEffect(() => {
    function connectWebSocket() {
      const newWs = new WebSocket('ws://localhost:3001');

      newWs.onopen = () => {
        console.log("WebSocket connection established");
      };

      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      newWs.onclose = () => {
        console.log("WebSocket connection closed, attempting to reconnect...");
        setTimeout(connectWebSocket, 3000); // Attempt to reconnect after 3 seconds
      };
      newWs.onmessage = (event) => {
        const received = JSON.parse(event.data);
        const { is_final } = received
        const transcript = received.channel.alternatives[0].transcript
        if (is_final && transcript) {
          console.log("Received:", received);

          if (received.type === "Results" && received.channel.alternatives.length > 0) {
            const newTranscript = received.channel.alternatives[0].transcript;
            console.log("New Transcript:", newTranscript);

            if (newTranscript) {
              setTranscription(prevTranscript => prevTranscript + newTranscript + " ");
            }
          }
        }
      };



      setWs(newWs);
    }

    connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);


  const startRecording = () => {
    console.log("Attempting to start recording...");

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        console.log("Stream obtained");
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          console.error("audio/webm MIME type not supported");
          return;
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.onstart = () => console.log("MediaRecorder started");
        mediaRecorder.onerror = (error) => console.error("MediaRecorder error:", error);
        mediaRecorder.start(1000); // Experiment with different timeslice values


        mediaRecorder.addEventListener("dataavailable", event => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("Sending audio data to server, size:", event.data.size);
            ws.send(event.data);
          } else {
            console.log("WebSocket not ready or closed");
          }
        });

        setIsRecording(true);
      }).catch(error => {
        console.error("Error getting media:", error);
      });
  };


  const stopRecording = () => {
    mediaRecorder.stop();
    setIsRecording(false);
  };

  return (
    <div>
      <h1>Live Transcription</h1>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      <p>{transcription}</p>
    </div>
  );
}

export default App;
