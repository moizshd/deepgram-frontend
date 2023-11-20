import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  const [transcription, setTranscription] = useState('');
  const [partiialTranscription, setPartialTranscription] = useState('');
  const lastFinalTranscriptRef = useRef('');

  const [isRecording, setIsRecording] = useState(false);
  const [ws, setWs] = useState(null);
  const mediaRecorderRef = useRef(null);

  const connectWebSocket = () => {
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

        // Check if the received message has the expected structure
        if (received && received.channel && received.channel.alternatives && received.channel.alternatives.length > 0) {
          const { is_final, speech_final } = received;
          const transcript = received.channel.alternatives[0].transcript;

        console.log("transcript", transcript, "isfinal", is_final, "speechFinal", speech_final)
        if (transcript) {
          if (is_final) {
            setPartialTranscription('');
            console.log("1")
            lastFinalTranscriptRef.current += transcript + " ";
          }
          if (speech_final) {
            console.log("2")

            setTranscription(lastFinalTranscriptRef.current + " ");
            // Reset lastFinalTranscriptRef and partialTranscriptionRef if needed
          }
          if (!is_final && !speech_final) {
            console.log("3")

            setPartialTranscription(transcript);
          }
        }
        else if (!transcript && speech_final) {
          console.log("4")

          setTranscription(lastFinalTranscriptRef.current + " ");
          // Reset lastFinalTranscriptRef and partialTranscriptionRef if needed
        }

        // Force update to re-render the component
        // This is a workaround to trigger re-render when useRef values are updated
        setIsRecording(isRecording => !isRecording);
        setIsRecording(isRecording => !isRecording);
      };

    }


      setWs(newWs);
    }
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);
    


  // useEffect(() => {
  //   console.log("My Last Final transcription in UE", lastFinalTranscript)
  // }, [lastFinalTranscript])

  const startRecording = () => {
    console.log("Attempting to start recording...");

    // Re-open WebSocket connection if it's closed
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        console.log("Stream obtained");
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          console.error("audio/webm MIME type not supported");
          return;
        }

        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current.onstart = () => console.log("MediaRecorder started");
        mediaRecorderRef.current.onerror = (error) => console.error("MediaRecorder error:", error);
        mediaRecorderRef.current.start(1000); // Experiment with different timeslice values


        mediaRecorderRef.current.addEventListener("dataavailable", event => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            // console.log("Sending audio data to server, size:", event.data.size);
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
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Close the WebSocket connection when stopping transcription
      if (ws) {
        ws.close();
        setWs(null); // Reset WebSocket state
      }
    } else {
      console.error('MediaRecorder not initialized');
    }
  };




  return (
    <div>
      <h1>Live Transcription</h1>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {/* Display Partial Transcript in Grey */}
      <p style={{ color: 'grey' }}>THIS IS PARTIAL TRANSCRIPTION : {partiialTranscription}</p>
      <p style={{ color: 'red' }}>THIS IS SEMI PARTIAL TRANSCRIPTION : {lastFinalTranscriptRef.current}</p>

      {/* Display Final Transcript in Black */}
      <p style={{ color: 'black' }}>THIS IS FINAL TRANSCRIPTION : {transcription}</p>
    </div>
  );
}

export default App;
