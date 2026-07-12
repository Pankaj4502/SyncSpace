'use client'

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

const socket = typeof window === "undefined" ? null : io("http://localhost:3001");

export default function CodeRoom() {
  const params = useParams();
  const currentRoom = params.roomid as string; 

  const [connectionState, setConnectionState] = useState(false);
  
  const yDocRef = useRef<Y.Doc>(new Y.Doc());

  useEffect(() => {
    return () => {
      if(yDocRef.current) yDocRef.current.destroy();
    }
  }, []);

  useEffect(() => {
    if (!socket || !currentRoom) return;

    // Join the specific room based on the URL
    socket.on('connect', () => {
      setConnectionState(true);
      socket.emit('join-room', currentRoom);
    });

    socket.on('disconnect', () => setConnectionState(false));

    // Listen for math packets from other users
    socket.on('receive-changes', (incomingUpdate) => {
      if (!yDocRef.current) return; 
      
      const updateArray = new Uint8Array(incomingUpdate);
      Y.applyUpdate(yDocRef.current, updateArray, 'remote');
    });

    return () => { 
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive-changes");
    }
  }, [currentRoom]);

  // 4. Editor Binding
  function handleEditorDidMount(editor: any) {
    const yText = yDocRef.current.getText('monaco');
    
    // Bind the Monaco Editor to the Yjs Math Engine
    new MonacoBinding(yText, editor.getModel(), new Set([editor]), null);

    // Whenever our local math changes (because we typed), send it to the server
    yDocRef.current.on('update', (update, origin) => {
      if (origin !== 'remote') { // ECHO STOPPER: Don't send back things we just received!
        socket?.emit("send-changes", update, currentRoom);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "10px 20px", backgroundColor: "#1e1e1e", color: "white" }}>
        <h2>Room: {currentRoom} - {connectionState ? "Online" : "Offline"}</h2>
      </div>
      
      <Editor
        height="100%"
        defaultLanguage="typescript"
        theme="vs-dark"
        defaultValue="// Start coding here"
        options={{ minimap: { enabled: false }, fontSize: 16 }}
        onMount={handleEditorDidMount}
      />
    </div>
  )
}