import { supabase } from "@/integrations/supabase/client";

export interface RealtimeEvent {
  type: string;
  transcript?: string;
  delta?: string;
  text?: string;
  item_id?: string;
  response_id?: string;
  [key: string]: unknown;
}

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private localStream: MediaStream | null = null;

  constructor(private onMessage: (event: RealtimeEvent) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async init(language: string = 'en') {
    try {
      console.log("Initializing RealtimeChat...");

      // Get ephemeral token from our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("realtime-session", {
        body: { language }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error("Failed to get ephemeral token");
      }

      if (!data?.client_secret?.value) {
        console.error("Response data:", data);
        throw new Error("Failed to get ephemeral token - no client_secret");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log("Got ephemeral key");

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio
      this.pc.ontrack = (e) => {
        console.log("Received remote track");
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      this.pc.addTrack(this.localStream.getTracks()[0]);
      console.log("Added local audio track");

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log("Data channel open");
      });

      this.dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data) as RealtimeEvent;
          console.log("Received event:", event.type);
          this.onMessage(event);
        } catch (err) {
          console.error("Error parsing event:", err);
        }
      });

      this.dc.addEventListener("error", (e) => {
        console.error("Data channel error:", e);
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log("Created offer");

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error("SDP response error:", sdpResponse.status, errorText);
        throw new Error(`Failed to connect: ${sdpResponse.status}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");

      return true;
    } catch (error) {
      console.error("Error initializing RealtimeChat:", error);
      this.disconnect();
      throw error;
    }
  }

  sendTextMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.error('Data channel not ready');
      return;
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: 'response.create' }));
  }

  disconnect() {
    console.log("Disconnecting RealtimeChat...");
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    this.audioEl.srcObject = null;
  }

  isConnected(): boolean {
    return this.dc?.readyState === 'open';
  }
}
