
import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [transcription, setTranscription] = useState('');
  const [partialTranscription, setPartialTranscription] = useState('');
  const lastFinalTranscriptRef = useRef('');
  const [isRecording, setIsRecording] = useState(false);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const startMediaRecorder = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        };
        mediaRecorderRef.current.start(1000);
        console.log("MediaRecorder started");
      }).catch(error => {
        console.error("Error getting media:", error);
      });
  };

  const startRecording = () => {
    setIsRecording(true);
    wsRef.current = new WebSocket('ws://localhost:3001');

    wsRef.current.onopen = () => {
      console.log("WebSocket connection established");
      startMediaRecorder();
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket connection closed");
      wsRef.current = null;
    };
    wsRef.current.onmessage = (event) => {
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
   
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTranscription('');
      setPartialTranscription('');
      lastFinalTranscriptRef.current = '';

      if (wsRef.current) {
        wsRef.current.close();
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
      <p style={{ color: 'grey' }}>THIS IS PARTIAL TRANSCRIPTION : {partialTranscription}</p>
      <p style={{ color: 'red' }}>THIS IS SEMI PARTIAL TRANSCRIPTION : {lastFinalTranscriptRef.current}</p>

      {/* Display Final Transcript in Black */}
      <p style={{ color: 'black' }}>THIS IS FINAL TRANSCRIPTION : {transcription}</p>
    </div>
  );
}

export default App;
