"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Clock, User, LogOut, AlertTriangle, Loader2, CheckCircle, Maximize, Minimize } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import WebcamMonitor from "@/components/exam/WebcamMonitor"

// Sample questions
const questions = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    answer: "Paris",
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Venus"],
    answer: "Mars",
  },
  {
    id: 3,
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    answer: "4",
  },
  {
    id: 4,
    question: "Which of the following is NOT a primary color?",
    options: ["Red", "Blue", "Green", "Yellow"],
    answer: "Green",
  },
  {
    id: 5,
    question: "What is the largest mammal in the world?",
    options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
    answer: "Blue Whale",
  },
]

export default function ExamPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutes in seconds
  const [warning, setWarning] = useState("")
  const [warningCount, setWarningCount] = useState(0)
  const [warningDialog, setWarningDialog] = useState(false)
  const [cheatingLogs, setCheatingLogs] = useState<string[]>([])
  const [startExamDialog, setStartExamDialog] = useState(true)
  const [faceDetectionReady, setFaceDetectionReady] = useState(false)
  const [examStarted, setExamStarted] = useState(false)
  const [examCompleted, setExamCompleted] = useState(false)
  const [examScore, setExamScore] = useState(0)
  const [resultsDialog, setResultsDialog] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [lastVisibilityState, setLastVisibilityState] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenExitAttempts, setFullscreenExitAttempts] = useState(0)
  const [studentName, setStudentName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  
  // Define logCheatingAttempt first before any useEffect hooks
  const logCheatingAttempt = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.warn(logMessage)
    setCheatingLogs(prev => [...prev, logMessage])
    setWarningCount(prev => prev + 1)
  }, [])
  
  // Function to enter fullscreen mode
  const enterFullscreen = useCallback(() => {
    if (containerRef.current) {
      try {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          (containerRef.current as any).mozRequestFullScreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          (containerRef.current as any).msRequestFullscreen();
        }
      } catch (err) {
        console.error("Failed to enter fullscreen:", err);
      }
    }
  }, []);
  
  // Function to exit fullscreen mode
  const exitFullscreen = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    } catch (err) {
      console.error("Failed to exit fullscreen:", err);
    }
  }, []);
  
  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFullscreen = document.fullscreenElement !== null || 
                             (document as any).webkitFullscreenElement !== null || 
                             (document as any).mozFullScreenElement !== null || 
                             (document as any).msFullscreenElement !== null;
      
      setIsFullscreen(isDocFullscreen);
      
      // If user exits fullscreen and exam is in progress, log it and try to re-enter
      if (!isDocFullscreen && examStarted && !examCompleted) {
        logCheatingAttempt("Attempted to exit fullscreen mode");
        setWarning("Exiting fullscreen mode is not allowed during the exam");
        setWarningDialog(true);
        
        const newAttemptCount = fullscreenExitAttempts + 1;
        setFullscreenExitAttempts(newAttemptCount);
        
        // If user has tried to exit fullscreen multiple times, warn them
        if (newAttemptCount >= 3) {
          setWarning("You have exited fullscreen mode multiple times. This will significantly affect your exam integrity score.");
          setWarningDialog(true);
        }
        
        // Try to re-enter fullscreen after a short delay
        setTimeout(() => {
          if (examStarted && !examCompleted) {
            enterFullscreen();
          }
        }, 1000);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [examStarted, examCompleted, fullscreenExitAttempts, enterFullscreen, logCheatingAttempt]);
  
  // Start exam (first activates face detection, then starts exam when ready)
  const prepareExam = () => {
    setStartExamDialog(false)
  }
  
  // Actually start the exam (called when face detection is ready)
  const startExam = () => {
    if (!faceDetectionReady) {
      return
    }
    if (!studentName.trim()) {
      setWarning("Please enter your name to start the exam")
      setWarningDialog(true)
      return
    }
    // Enter fullscreen mode before starting exam
    enterFullscreen();
    setExamStarted(true)
  }
  
  // Anti-cheating: Timer countdown
  useEffect(() => {
    if (examStarted && timeLeft > 0 && !examCompleted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            // Auto-submit when time runs out
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [examStarted, timeLeft, examCompleted])
  
  // Anti-cheating: Prevent right-click and keyboard shortcuts
  useEffect(() => {
    if (!examStarted || examCompleted) return
    
    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault()
      logCheatingAttempt('Attempted to use right-click menu')
      setWarning('Right-click menu is disabled during the exam')
      setWarningDialog(true)
      return false
    }
    
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Detect Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+P, etc.
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase()
        if (['c', 'v', 'x', 'p', 'a', 's', 'u'].includes(key)) {
          e.preventDefault()
          logCheatingAttempt(`Attempted keyboard shortcut: Ctrl+${key.toUpperCase()}`)
          setWarning(`Keyboard shortcut Ctrl+${key.toUpperCase()} is disabled during the exam`)
          setWarningDialog(true)
          return false
        }
      }
      
      // Prevent PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        logCheatingAttempt('Attempted to use PrintScreen')
        setWarning('Screenshot capture is disabled during the exam')
        setWarningDialog(true)
        return false
      }
      
      // Prevent Alt+Tab
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault()
        logCheatingAttempt('Attempted to use Alt+Tab')
        setWarning('Switching applications is not allowed during the exam')
        setWarningDialog(true)
        return false
      }
      
      // Prevent Escape key from exiting fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault()
        logCheatingAttempt('Attempted to use Escape key to exit fullscreen')
        setWarning('Escape key is disabled during the exam')
        setWarningDialog(true)
        return false
      }
      
      // Prevent F11 key (another way to toggle fullscreen)
      if (e.key === 'F11') {
        e.preventDefault()
        logCheatingAttempt('Attempted to use F11 key to toggle fullscreen')
        setWarning('F11 key is disabled during the exam')
        setWarningDialog(true)
        return false
      }
    }
    
    // Add event listeners to block right-click and keyboard shortcuts
    document.addEventListener('contextmenu', preventRightClick)
    document.addEventListener('keydown', preventKeyboardShortcuts)
    
    // Remove event listeners when component unmounts or exam is completed
    return () => {
      document.removeEventListener('contextmenu', preventRightClick)
      document.removeEventListener('keydown', preventKeyboardShortcuts)
    }
  }, [examStarted, examCompleted, isFullscreen, logCheatingAttempt])
  
  // Anti-cheating: Tab switching detection
  useEffect(() => {
    if (!examStarted || examCompleted) return
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && lastVisibilityState !== 'hidden') {
        logCheatingAttempt(`Tab switched at ${new Date().toLocaleTimeString()}`)
        setWarning('Tab switching detected. This will be recorded as a potential cheating attempt.')
        setWarningDialog(true)
      }
      setLastVisibilityState(document.visibilityState)
    }
    
    const handleBlur = () => {
      logCheatingAttempt(`Window lost focus at ${new Date().toLocaleTimeString()}`)
      setWarning('Window focus lost. This will be recorded as a potential cheating attempt.')
      setWarningDialog(true)
    }
    
    // Add event listeners for tab switching and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    
    // Prevent browser closing or refreshing
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Cancel the event and show confirmation dialog
      e.preventDefault()
      // Chrome requires returnValue to be set
      e.returnValue = ''
      
      logCheatingAttempt('Attempted to close or refresh the browser')
      return 'Are you sure you want to leave the exam? Your progress will be lost.'
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Remove event listeners when component unmounts or exam is completed
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [examStarted, examCompleted, lastVisibilityState, logCheatingAttempt])
  
  // Handle face detection readiness
  const handleFaceDetectionReady = (ready: boolean) => {
    setFaceDetectionReady(ready)
  }
  
  // Handle face detection status from WebcamMonitor
  const handleFaceDetectionStatus = (faceDetected: boolean, multipleFaces: boolean, faceCount: number) => {
    if (!examCompleted) {
      if (!faceDetected) {
        logCheatingAttempt("No face detected in frame")
        setWarning("Your face must be visible during the exam")
        setWarningDialog(true)
      }
      
      if (multipleFaces) {
        logCheatingAttempt(`Multiple faces detected in frame (${faceCount} faces)`)
        setWarning(`${faceCount} faces detected. Only your face should be visible during the exam.`)
        setWarningDialog(true)
      }
    }
  }
  
  // Handle answer selection
  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion]: answer }))
  }
  
  // Navigate to next question
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }
  
  // Navigate to previous question
  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }
  
  // Return to home page
  const handleReturnHome = () => {
    // Exit fullscreen if active
    if (isFullscreen) {
      exitFullscreen()
    }
    router.push("/")
  }
  
  // Submit exam
  const handleSubmit = () => {
    // Stop timer
    setExamCompleted(true)
    
    // Turn off camera
    setCameraOff(true)
    
    // Exit fullscreen mode
    if (isFullscreen) {
      exitFullscreen()
    }
    
    // Calculate score (iterate over questions to avoid key mismatches)
    const score = questions.reduce((total, q, i) => {
      return total + (selectedAnswers[i] === q.answer ? 1 : 0)
    }, 0)
    
    // Save score
    setExamScore(score)
    
    // Prepare results
    const results = {
      studentName: studentName.trim(),
      score,
      totalQuestions: questions.length,
      cheatingLogs,
      warningCount,
      answers: selectedAnswers,
      fullscreenExits: fullscreenExitAttempts
    }
    
    console.log("Exam results:", results)

    // Send to backend (fire-and-forget)
    ;(async () => {
      try {
        setSubmitting(true)
        await fetch('/api/exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(results)
        })
      } catch (e) {
        console.error('Failed to submit results', e)
      } finally {
        setSubmitting(false)
      }
    })()
    
    // Show results dialog
    setResultsDialog(true)
  }
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50">
      {/* Start Exam Dialog */}
      <Dialog open={startExamDialog} onOpenChange={setStartExamDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ready to start your exam?</DialogTitle>
            <DialogDescription>
              Please ensure you're in a quiet environment and your camera is working.
              The exam has a time limit of 30 minutes.
              <div className="mt-4 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <p className="font-bold">Important:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>The exam will run in fullscreen mode</li>
                  <li>Right-clicking will be disabled during the exam</li>
                  <li>Switching tabs will be detected and reported</li>
                  <li>Keyboard shortcuts (Ctrl+C, Ctrl+V, etc.) will be disabled</li>
                  <li>Your face must be visible at all times</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="studentName">Your Name</Label>
              <input
                id="studentName"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your full name"
                className="border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={prepareExam} className="w-full" disabled={!studentName.trim()}>
                Prepare Exam
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <Dialog open={warningDialog} onOpenChange={setWarningDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-amber-500">
              <AlertTriangle className="mr-2 h-5 w-5" /> Warning
            </DialogTitle>
            <DialogDescription>{warning}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setWarningDialog(false)}>
              Acknowledge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialog} onOpenChange={setResultsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="mr-2 h-5 w-5" /> Exam Completed
            </DialogTitle>
            <DialogDescription>
              <div className="mt-4 text-center">
                <div className="text-4xl font-bold mb-2">{examScore}/{questions.length}</div>
                <div className="text-sm text-gray-500">Your final score</div>
                
                {warningCount > 0 && (
                  <div className="mt-4 text-sm text-amber-500 bg-amber-50 p-3 rounded">
                    <AlertTriangle className="inline-block mr-1 h-4 w-4" />
                    {warningCount} warning{warningCount !== 1 ? 's' : ''} were recorded during your exam.
                  </div>
                )}
                
                {fullscreenExitAttempts > 0 && (
                  <div className="mt-2 text-sm text-amber-500 bg-amber-50 p-3 rounded">
                    <AlertTriangle className="inline-block mr-1 h-4 w-4" />
                    Fullscreen mode was exited {fullscreenExitAttempts} time{fullscreenExitAttempts !== 1 ? 's' : ''}.
                  </div>
                )}
                
                <div className="mt-4">
                  Thank you for completing the exam. Your camera has been turned off.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleReturnHome} className="w-full" disabled={submitting}>
              Return to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-exam face detection setup screen */}
      {!startExamDialog && !examStarted && (
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 shadow-sm">
            <div className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              <span className="font-medium">Exam Setup</span>
            </div>
          </header>
          
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Face Detection Setup</h2>
                <p className="text-gray-600">
                  We need to verify your camera is working properly before starting the exam.
                  Please make sure only your face is visible in the camera.
                </p>
                <p className="mt-2 text-amber-600 text-sm">
                  <AlertTriangle className="inline-block mr-1 h-4 w-4" />
                  The exam will start in fullscreen mode. Please close any unnecessary applications.
                </p>
              </div>
              
              <div className="space-y-6">
                <WebcamMonitor 
                  onFaceDetectionStatus={handleFaceDetectionStatus} 
                  onFaceDetectionReady={handleFaceDetectionReady}
                  isActive={!startExamDialog} 
                  stopCamera={cameraOff}
                />
                
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">System Status</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${faceDetectionReady ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      <span>Face Detection: {faceDetectionReady ? 'Ready' : 'Loading...'}</span>
                    </li>
                  </ul>
                </div>
                
                <Button 
                  className="w-full" 
                  disabled={!faceDetectionReady}
                  onClick={startExam}
                >
                  {!faceDetectionReady && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {faceDetectionReady ? 'Start Exam in Fullscreen' : 'Waiting for face detection...'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main exam view */}
      {examStarted && (
        <>
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 shadow-sm">
            <div className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              <span className="font-medium">Student Exam Portal</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center text-amber-500">
                <Clock className="mr-1 h-5 w-5" />
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </div>
              
              <div className="hidden md:flex items-center text-blue-500">
                {isFullscreen ? (
                  <Minimize className="mr-1 h-5 w-5" />
                ) : (
                  <Maximize className="mr-1 h-5 w-5 animate-pulse" />
                )}
                <span className="text-xs font-medium">
                  {isFullscreen ? 'Fullscreen Mode' : 'Please enter fullscreen'}
                </span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to end the exam?")) {
                    handleSubmit()
                  }
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> End Exam
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            {/* Left Side - Webcam */}
            <div className="relative space-y-4">
              {/* Using the WebcamMonitor component */}
              <WebcamMonitor 
                onFaceDetectionStatus={handleFaceDetectionStatus} 
                onFaceDetectionReady={handleFaceDetectionReady}
                isActive={!startExamDialog} 
                stopCamera={cameraOff}
              />

              <Card>
                <div className="p-4">
                  <h3 className="mb-2 font-medium">Exam Progress</h3>
                  <Progress
                    value={
                      (Object.keys(selectedAnswers).length / questions.length) * 100
                    }
                    className="h-2"
                  />
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium">
                      {Object.keys(selectedAnswers).length}/{questions.length}
                    </span>{" "}
                    questions answered
                  </div>
                </div>
              </Card>
              
              {!isFullscreen && (
                <Card className="bg-amber-50 border-amber-200">
                  <div className="p-4">
                    <div className="flex items-center space-x-2 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                      <h3 className="font-medium">Fullscreen Required</h3>
                    </div>
                    <p className="mt-2 text-sm text-amber-700">
                      Please enter fullscreen mode for the exam.
                    </p>
                    <Button 
                      className="mt-2 w-full bg-amber-600 hover:bg-amber-700"
                      onClick={enterFullscreen}
                    >
                      <Maximize className="mr-2 h-4 w-4" /> Enter Fullscreen
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Right Side - Questions */}
            <div className="col-span-1 space-y-4 md:col-span-2">
              <Card className="min-h-[60vh]">
                <div className="flex flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      Question {currentQuestion + 1} of {questions.length}
                    </h2>
                  </div>

                  <div className="mb-8">
                    <p className="text-lg">{questions[currentQuestion].question}</p>
                  </div>

                  <div className="mb-8">
                    <RadioGroup
                      value={selectedAnswers[currentQuestion] || ""}
                      onValueChange={(value) => handleSelectAnswer(value)}
                      className="space-y-3"
                    >
                      {questions[currentQuestion].options.map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                        >
                          <RadioGroupItem value={option} id={option} />
                          <Label htmlFor={option} className="flex-grow cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="mt-auto flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestion === 0}
                    >
                      Previous
                    </Button>
                    {currentQuestion === questions.length - 1 ? (
                      <Button onClick={handleSubmit}>Submit Exam</Button>
                    ) : (
                      <Button onClick={handleNextQuestion}>Next</Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}