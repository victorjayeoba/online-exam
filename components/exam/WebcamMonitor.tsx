"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"

interface WebcamMonitorProps {
  onFaceDetectionStatus: (detected: boolean, multipleFaces: boolean, faceCount: number) => void;
  onFaceDetectionReady: (ready: boolean) => void;
  isActive: boolean;
  stopCamera?: boolean;
}

export default function WebcamMonitor({ 
  onFaceDetectionStatus, 
  onFaceDetectionReady, 
  isActive,
  stopCamera = false
}: WebcamMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [faceDetectionReady, setFaceDetectionReady] = useState(false)
  const [faceApiLoaded, setFaceApiLoaded] = useState(false)
  const [multipleFaces, setMultipleFaces] = useState(false)
  const [faceCount, setFaceCount] = useState(0)
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  // Load face-api.js script
  useEffect(() => {
    // Check if face-api is already loaded
    if ((window as any).faceapi) {
      setFaceApiLoaded(true)
      return
    }

    // Import face-api.js from CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    script.async = true
    
    script.onload = () => {
      console.log('Face-api.js loaded')
      setFaceApiLoaded(true)
    }
    
    document.head.appendChild(script)
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Stop camera when stopCamera prop changes to true
  useEffect(() => {
    if (stopCamera && videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
      setFaceDetectionReady(false)
      setInitialCheckDone(false)
      console.log('Camera stopped')
    }
  }, [stopCamera])

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [])

  // Initialize camera when component mounts or becomes active
  useEffect(() => {
    if (isActive && !cameraActive && !stopCamera) {
      startCamera()
    }
  }, [isActive, cameraActive, stopCamera])

  // Load models when face-api is loaded and camera is active
  useEffect(() => {
    if (faceApiLoaded && cameraActive && !faceDetectionReady) {
      loadModels()
    }
  }, [faceApiLoaded, cameraActive, faceDetectionReady])
  
  // Notify parent component about face detection readiness
  useEffect(() => {
    // Only notify when we've completed at least one detection cycle
    if (faceDetectionReady && initialCheckDone) {
      onFaceDetectionReady(true)
    } else {
      onFaceDetectionReady(false)
    }
  }, [faceDetectionReady, initialCheckDone, onFaceDetectionReady])
  
  // Start webcam
  const startCamera = async () => {
    try {
      if (!videoRef.current || stopCamera) return

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user"
        },
        audio: false
      })
      
      videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch (err) {
      console.error("Error starting camera:", err)
      alert("Failed to access webcam. Please ensure your camera is connected and you have given permission to use it.")
    }
  }
  
  // Load face detection models
  const loadModels = async () => {
    try {
      const faceapi = (window as any).faceapi
      if (!faceapi) {
        console.error("Face API not available")
        return
      }

      // Use CDN for models instead of local files
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      
      console.log('Face detection models loaded')
      setFaceDetectionReady(true)
    } catch (err) {
      console.error("Error loading face detection models:", err)
    }
  }
  
  // Start face detection loop
  useEffect(() => {
    if (!faceDetectionReady || !cameraActive || !videoRef.current || !canvasRef.current || stopCamera) return
    
    const faceapi = (window as any).faceapi
    if (!faceapi) return
    
    const checkFace = async () => {
      if (!videoRef.current || !canvasRef.current || stopCamera) return
      
      try {
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5
        })
        
        const detections = await faceapi.detectAllFaces(
          videoRef.current, 
          options
        ).withFaceLandmarks().withFaceExpressions()
        
        // Mark initial check as done after first detection
        if (!initialCheckDone) {
          setInitialCheckDone(true)
        }
        
        // Get number of faces detected
        const detectedFaceCount = detections.length
        setFaceCount(detectedFaceCount)
        
        // Check for multiple faces
        const hasMultipleFaces = detectedFaceCount > 1
        setMultipleFaces(hasMultipleFaces)
        
        // Draw detections on canvas
        const canvas = canvasRef.current
        const displaySize = { width: videoRef.current.width || 640, height: videoRef.current.height || 480 }
        faceapi.matchDimensions(canvas, displaySize)
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Clear the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // Draw face detections with custom style
          resizedDetections.forEach((detection: any, index: number) => {
            // Draw rectangle around face with different colors based on index
            const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']
            const color = colors[index % colors.length]
            
            const box = detection.detection.box
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.strokeRect(box.x, box.y, box.width, box.height)
            
            // Add index number
            ctx.fillStyle = color
            ctx.font = '16px Arial'
            ctx.fillText(`Face #${index + 1}`, box.x, box.y - 5)
          })
          
          // Draw face landmarks
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
          
          // Add face count text
          ctx.fillStyle = 'white'
          ctx.font = 'bold 16px Arial'
          ctx.fillText(`Number of faces: ${detectedFaceCount}`, 10, 25)
        }
        
        // Report face detection status to parent component
        const faceDetected = detectedFaceCount >= 1
        onFaceDetectionStatus(faceDetected, hasMultipleFaces, detectedFaceCount)
        
        // Log detection events
        if (detectedFaceCount === 0) {
          console.warn("No face detected")
        } else if (hasMultipleFaces) {
          console.warn(`Multiple faces detected: ${detectedFaceCount}`)
        }
      } catch (error) {
        console.error("Error in face detection:", error)
      }
    }
    
    // Run face detection every 2 seconds
    const faceDetectionInterval = setInterval(checkFace, 2000)
    
    // Initial check
    checkFace()
    
    return () => clearInterval(faceDetectionInterval)
  }, [faceDetectionReady, cameraActive, onFaceDetectionStatus, initialCheckDone, stopCamera])
  
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width="640"
          height="480"
          className="absolute h-full w-full object-cover"
        />
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          className="absolute h-full w-full object-cover"
        />
        {!cameraActive && !stopCamera && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
            Starting camera...
          </div>
        )}
        {cameraActive && !faceDetectionReady && !stopCamera && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
            <div className="text-center">
              <div className="animate-pulse mb-3">Loading face detection models...</div>
              <div className="text-xs">This may take a few moments</div>
            </div>
          </div>
        )}
        {faceDetectionReady && !initialCheckDone && !stopCamera && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
            Initializing face detection...
          </div>
        )}
        {multipleFaces && !stopCamera && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
            {faceCount} faces detected!
          </div>
        )}
        {stopCamera && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
            Camera turned off
          </div>
        )}
      </div>
      <div className="p-3 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <div>Your face must be the only one visible during the exam</div>
          <div>
            {!stopCamera ? (
              <>
                {!faceDetectionReady && <span className="text-amber-500">Loading face detection...</span>}
                {faceDetectionReady && !initialCheckDone && <span className="text-amber-500">Initializing...</span>}
                {faceDetectionReady && initialCheckDone && <span className="text-green-500">Face tracking active</span>}
              </>
            ) : (
              <span className="text-gray-500">Face tracking disabled</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
} 