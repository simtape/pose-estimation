import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {MatIcon} from "@angular/material/icon";
import {MatButton} from "@angular/material/button";
import {WebcamComponent, WebcamModule} from "ngx-webcam";
import {FilesetResolver, HandLandmarker} from "@mediapipe/tasks-vision";
import {stringify} from "postcss";
import {HAND_CONNECTIONS} from "@mediapipe/hands";
import {DrawingUtils} from "@mediapipe/tasks-vision";
import {Connection} from "../../utils/Connection";


@Component({
  selector: 'app-video-capture',
  standalone: true,
  imports: [
    MatIcon,
    MatButton,
    WebcamModule
  ],
  templateUrl: './video-capture.component.html',
  styleUrl: './video-capture.component.css'
})
export class VideoCaptureComponent implements AfterViewInit {
  // remaining time for recording in formatted minutes-seconds
  remainingTime: string;
  bpm: number;

  isRecording: boolean;
  handLandmarker!: HandLandmarker;
  lastVideoTime: number = -1;
  results: any;
  predict: boolean = false;


  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('landmarkCanvas') landmarksCanvas!: ElementRef<HTMLCanvasElement>;
  canvasCtx!: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  drawingUtils!: DrawingUtils;


  constructor() {
    this.remainingTime = '01:00';
    this.bpm = 60;
    this.isRecording = false;

    const createHandLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: 'VIDEO',
        numHands: 2
      });
    };

    createHandLandmarker().then(() => {
      console.log("HandLandmarker loaded successfully");
    });

  }

  ngAfterViewInit() {
    const canvasElement = this.landmarksCanvas.nativeElement;
    this.canvasCtx = canvasElement.getContext('2d') as CanvasRenderingContext2D;
    if (!this.canvasCtx) {
      console.error('Failed to get 2D context from canvas');
      return;
    }

    this.drawingUtils = new DrawingUtils(this.canvasCtx);

    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      // Set the stream as the video source
      const videoElement = this.video.nativeElement;
      videoElement.srcObject = stream;
      videoElement.play();  // Play the video once stream is set
    }).catch((error) => {
      console.error('Error accessing the webcam: ', error);
    });

    this.video.nativeElement.addEventListener('loadeddata', () => {
      this.detectHandsLandmarks();
    });
  }

  private detectHandsLandmarks() {
    const videoElement = this.video.nativeElement;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      // Resize the canvas
      this.landmarksCanvas.nativeElement.width = videoElement.videoWidth;
      this.landmarksCanvas.nativeElement.height = videoElement.videoHeight;

      // Detect hand landmarks
      const results = this.handLandmarker.detectForVideo(videoElement, performance.now());

      // Clear and draw landmarks
      this.canvasCtx.clearRect(0, 0, this.landmarksCanvas.nativeElement.width, this.landmarksCanvas.nativeElement.height);
      if (results.landmarks) {
        const drawingUtils = new DrawingUtils(this.canvasCtx);

        console.log('Detected landmarks:', results.landmarks);

        for (const landmarks of results.landmarks) {

          // convert HAND_CONNECTIONS to Connection[]
          const connections: Connection[] = [];
          for (const connection of HAND_CONNECTIONS) {
            connections.push({start: connection[0], end: connection[1]});
          }

          // Draw connectors
          drawingUtils.drawConnectors(landmarks, connections, { color: '#00FF00', lineWidth: 5 });
          // Draw landmarks
          drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 2 });
        }
      }
    }

    // Continue the detection loop
    requestAnimationFrame(() => this.detectHandsLandmarks());
  }
}
