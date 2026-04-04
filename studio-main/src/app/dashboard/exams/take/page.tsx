"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Timer, AlertCircle, ChevronLeft, ChevronRight, Send, CheckCircle2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Mock Exam Questions with support for images and text combinations
const MOCK_QUESTIONS = [
  {
    id: 1,
    text: "Identify the electronic component shown in the diagram below:",
    imageUrl: "https://picsum.photos/seed/physics-comp/800/400",
    options: ["Resistor", "Capacitor", "Transistor", "Diode"],
    correct: 1
  },
  {
    id: 2,
    text: "Which law of thermodynamics states that entropy of an isolated system never decreases?",
    options: ["Zeroth Law", "First Law", "Second Law", "Third Law"],
    correct: 2
  },
  {
    id: 3,
    text: "", // Image-only question
    imageUrl: "https://picsum.photos/seed/physics-graph/800/400",
    options: ["Constant Velocity", "Uniform Acceleration", "Stationary Object", "Deceleration"],
    correct: 1
  },
  {
    id: 4,
    text: "The rate of change of displacement is known as:",
    options: ["Speed", "Acceleration", "Velocity", "Momentum"],
    correct: 2
  }
];

export default function TakeExamPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("id");

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelect = (optionIndex: number) => {
    setAnswers({ ...answers, [currentQuestion]: optionIndex });
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    toast({
      title: language === 'en' ? "Exam Submitted" : "Examen Soumis",
      description: language === 'en' ? "Your answers have been saved and graded." : "Vos réponses ont été enregistrées et notées.",
    });
    // Simulate submission delay
    setTimeout(() => {
      router.push(`/dashboard/exams/results?id=NEW_SUBMISSION&examId=${examId}`);
    }, 1500);
  };

  const question = MOCK_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / MOCK_QUESTIONS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-4 border-b gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} disabled={isSubmitted} className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3 border-l pl-2 md:pl-4">
            <Avatar className="h-8 w-8 md:h-10 md:w-10 ring-2 ring-primary/10 shrink-0">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-primary/5 text-primary">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block overflow-hidden">
              <p className="text-xs font-black leading-none text-primary truncate uppercase">{user?.name?.split(' ')[0]}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-mono font-bold mt-1 truncate">{user?.id}</p>
            </div>
          </div>

          <div className="border-l pl-2 md:pl-4">
            <h1 className="font-bold text-sm md:text-base line-clamp-1 uppercase">Physics MCQ</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {currentQuestion + 1} / {MOCK_QUESTIONS.length}
            </p>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center self-end md:self-auto gap-2 px-4 py-2 rounded-full font-mono font-bold text-xs md:text-sm shadow-sm transition-colors shrink-0",
          timeLeft < 300 ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-white"
        )}>
          <Timer className="w-3 h-3 md:w-4 md:h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="space-y-8 pb-20 px-1">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
            <span>{language === 'en' ? 'Progress' : 'Progression'}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="pb-6 bg-accent/10 border-b">
            {question.text && (
              <CardTitle className="text-lg md:text-2xl leading-relaxed text-primary">
                {question.text}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent className="pt-6 md:pt-8 space-y-6 md:space-y-8">
            {/* MULTIMEDIA QUESTION SUPPORT */}
            {question.imageUrl && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 md:border-4 border-white shadow-xl bg-accent/30 group">
                <img 
                  src={question.imageUrl} 
                  alt="Question Diagram" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-2 right-2 md:top-4 md:right-4">
                  <Badge variant="secondary" className="bg-white/80 backdrop-blur-md border-none text-primary font-black uppercase text-[8px] md:text-[9px] px-2 md:px-3">
                    Diagram {question.id}
                  </Badge>
                </div>
              </div>
            )}

            <RadioGroup 
              value={answers[currentQuestion]?.toString()} 
              onValueChange={(val) => handleSelect(parseInt(val))}
              className="space-y-3"
            >
              {question.options.map((option, idx) => (
                <div key={idx} className={cn(
                  "flex items-center space-x-3 p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-primary/50",
                  answers[currentQuestion] === idx 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-accent bg-background"
                )} onClick={() => handleSelect(idx)}>
                  <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} className="sr-only" />
                  <div className={cn(
                    "w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center shrink-0 font-bold transition-colors text-sm",
                    answers[currentQuestion] === idx 
                      ? "border-primary bg-primary text-white" 
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <Label htmlFor={`opt-${idx}`} className="flex-1 text-sm md:text-base cursor-pointer font-medium leading-tight">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex flex-col md:flex-row justify-between border-t mt-6 md:mt-8 pt-6 gap-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0 || isSubmitted}
              className="w-full md:w-auto gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> {language === 'en' ? 'Previous' : 'Précédent'}
            </Button>
            
            {currentQuestion === MOCK_QUESTIONS.length - 1 ? (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitted || Object.keys(answers).length < MOCK_QUESTIONS.length}
                className="w-full md:w-auto gap-2 bg-green-600 hover:bg-green-700 shadow-lg text-white font-bold px-8"
              >
                <Send className="w-4 h-4" /> {t("submitExam")}
              </Button>
            ) : (
              <Button 
                onClick={() => setCurrentQuestion(prev => Math.min(MOCK_QUESTIONS.length - 1, prev + 1))}
                disabled={isSubmitted || answers[currentQuestion] === undefined}
                className="w-full md:w-auto gap-2 px-8"
              >
                {language === 'en' ? 'Next' : 'Suivant'} <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </CardFooter>
        </Card>

        {Object.keys(answers).length < MOCK_QUESTIONS.length && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs md:text-sm animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">
              {language === 'en' 
                ? "Please answer all questions before submitting." 
                : "Veuillez répondre à toutes les questions avant de soumettre."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
