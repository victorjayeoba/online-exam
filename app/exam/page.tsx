"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Clock, User, LogOut, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
  
  // Define logCheatingAttempt first before any useEffect hooks
  const logCheatingAttempt = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.warn(logMessage)
    setCheatingLogs(prev => [...prev, logMessage])
    setWarningCount(prev => prev + 1)
  }, [])
  
  // Start exam without fullscreen mode
  const startExam = () => {
    setStartExamDialog(false);
  };
  
  // Anti-cheating: Timer countdown
  useEffect(() => {
    if (!startExamDialog && timeLeft > 0) {
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
  }, [startExamDialog, timeLeft])
  
  // Handle face detection status from WebcamMonitor
  const handleFaceDetectionStatus = (faceDetected: boolean, multipleFaces: boolean, faceCount: number) => {
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
  
  // Submit exam
  const handleSubmit = () => {
    let score = 0
    Object.keys(selectedAnswers).forEach((questionIndex) => {
      const index = parseInt(questionIndex)
      if (selectedAnswers[index] === questions[index].answer) {
        score++
      }
    })
    
    // Prepare results
    const results = {
      score,
      totalQuestions: questions.length,
      cheatingLogs,
      warningCount,
      answers: selectedAnswers
    }
    
    console.log("Exam results:", results)
    
    // Show score and navigate back to login
    alert(`Exam completed! Your score: ${score}/${questions.length}`)
    router.push("/")
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
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Button onClick={startExam} className="w-full">
                Start Exam
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
            isActive={!startExamDialog} 
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
    </div>
  )
}