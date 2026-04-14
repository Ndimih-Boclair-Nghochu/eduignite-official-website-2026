"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  MessageSquare,
  Send,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string; ts: number };

// ─── Static FAQ knowledge base ───────────────────────────────────────────────

const FAQ_TOPICS = [
  { label: "Getting Started", prompt: "How do I get started on EduIgnite?" },
  { label: "Update My Profile", prompt: "How do I update my profile?" },
  { label: "Manage Students", prompt: "How do I manage students?" },
  { label: "Take Attendance", prompt: "How do I take attendance?" },
  { label: "Enter Grades", prompt: "How do I enter grades?" },
  { label: "Manage Fees", prompt: "How do I manage fees and payments?" },
  { label: "Live Classes", prompt: "How do live classes work?" },
  { label: "Library", prompt: "How do I use the library?" },
  { label: "Announcements", prompt: "How do I post an announcement?" },
  { label: "Chat & Messaging", prompt: "How does the chat system work?" },
  { label: "Reset Password", prompt: "How do I reset my password?" },
  { label: "Manage Schools", prompt: "How do I add or manage schools?" },
  { label: "Platform Settings", prompt: "How do I configure platform settings?" },
  { label: "Reports & Stats", prompt: "How do I view reports and statistics?" },
];

interface KBEntry {
  keywords: string[];
  answer: string;
}

const KNOWLEDGE_BASE: KBEntry[] = [
  {
    keywords: ["get started", "first time", "new user", "begin", "onboard", "welcome"],
    answer: `Welcome to **EduIgnite**! Here's how to get started:

1. **Log in** using your matricule and password at the login page.
2. **Update your profile** — go to the top-right menu → Profile to add your photo and phone number.
3. **Explore your Dashboard** — your home screen shows stats relevant to your role.
4. **Navigate using the sidebar** — sections visible to you depend on your role (Student, Teacher, Parent, School Admin, CEO, etc.).
5. **Need help?** — come back here and ask a question any time!

Common first steps by role:
- **Students**: Check your grades, attendance, and upcoming live classes.
- **Teachers**: Take attendance, enter grades, and schedule live classes.
- **Parents**: View your child's grades, attendance, and fees.
- **School Admin**: Manage students, teachers, fee structures, and school settings.
- **CEO/CTO**: Access platform-wide statistics, manage all schools, and configure platform settings.`,
  },
  {
    keywords: ["update profile", "edit profile", "change name", "change phone", "phone number", "profile picture", "avatar", "upload photo", "profile image"],
    answer: `To update your profile:

1. Click your **avatar / name** in the top-right corner of the dashboard.
2. Select **"Profile"** from the dropdown menu.
3. On the Profile page you can:
   - **Upload a profile picture** — click the camera icon on your avatar and select an image from your device.
   - **Change your name** — edit the Name field and click Save.
   - **Add/change your phone number** — fill in the Phone field and click Save.
   - **Change your password** — use the Change Password section.

All changes are saved automatically to the server. Your profile picture will appear across the platform after saving.`,
  },
  {
    keywords: ["manage student", "add student", "enroll student", "student list", "student record", "student profile"],
    answer: `Managing students (School Admin / Teacher):

**View Students:**
- Go to **Students** in the sidebar to see the full list.
- Filter by class or search by name or matricule.

**Add a Student:**
1. Click **"Add Student"** button on the Students page.
2. Fill in the student's details (name, date of birth, class, parent info).
3. Click **Save** — a matricule is auto-generated.

**View a Student's Profile:**
- Click on any student's name to open their detailed profile showing grades, attendance, fees, and more.

**Link a Parent:**
- Open the student's profile → click **"Link Parent"** and enter the parent's matricule.

**Student Card:**
- Open the student's profile → click **"Download Student Card"** to generate a printable ID card.`,
  },
  {
    keywords: ["attendance", "mark attendance", "take attendance", "absent", "present", "attendance record", "attendance report"],
    answer: `Managing Attendance (Teachers / School Admin):

**Taking Attendance:**
1. Go to **Attendance** in the sidebar.
2. Click **"New Session"** — select the class and date.
3. Mark each student as Present, Absent, or Late.
4. Click **"Save Session"** to record it.

**Viewing Attendance:**
- Go to **Attendance → Records** to see past sessions.
- Filter by class, date range, or student.
- Click **"Class Report"** for a full class summary.
- Click **"Student Summary"** on a student's profile to see their individual attendance history.

**Absent Students Today:**
- The dashboard shows a quick count of students absent today.
- Go to Attendance → filter by today for the full list.`,
  },
  {
    keywords: ["grade", "enter grade", "add grade", "grade entry", "report card", "result", "sequence", "subject", "marks", "score"],
    answer: `Managing Grades (Teachers / School Admin):

**Entering Grades:**
1. Go to **Grades** in the sidebar.
2. Select the **Sequence** (exam period) and **Subject**.
3. Click **"Add Grades"** — you can enter grades one by one or use **Bulk Entry**.
4. Enter each student's score and click **Save**.

**Viewing Report Cards:**
1. Open a student's profile.
2. Click **"Report Card"** → select the sequence.
3. A printable report card is generated with all subjects and rankings.

**Class Results:**
- Go to Grades → **Class Results** → select a class and sequence to see the full ranking.

**Subjects & Sequences:**
- School Admins can create/manage subjects under **Grades → Subjects**.
- Sequences (exam periods) are managed under **Grades → Sequences**.`,
  },
  {
    keywords: ["fee", "payment", "pay fee", "fee structure", "invoice", "receipt", "outstanding", "revenue", "finance"],
    answer: `Managing Fees & Payments:

**For Parents / Students:**
- Go to **Fees → My Payments** to see your payment history and outstanding fees.
- Click **"Make Payment"** to record a new payment (pending confirmation by admin).
- Download your **receipt** from a confirmed payment.

**For School Admin / Finance Staff:**
1. **Create Fee Structures**: Fees → Fee Structures → Add Structure (set amount, class, term).
2. **Confirm Payments**: Fees → Payments → select a pending payment → click **Confirm** or **Reject**.
3. **View Outstanding Fees**: Fees → Outstanding to see who hasn't paid.
4. **Revenue Report**: Fees → Revenue Report for a summary of collections.

**Invoices:**
- Invoices are auto-generated and accessible under Fees → Invoices.`,
  },
  {
    keywords: ["live class", "online class", "video class", "schedule class", "start class", "join class", "enroll class"],
    answer: `Using Live Classes:

**For Students:**
- Go to **Live Classes** in the sidebar.
- See **Upcoming** classes and click **"Enroll"** to register.
- When a class is live, click **"Join"** to enter.
- View your enrolled classes under **"My Classes"**.

**For Teachers:**
1. Go to **Live Classes → Create Class**.
2. Fill in the title, subject, date/time, and description.
3. Click **Save** — students can now enroll.
4. At the scheduled time, click **"Start Class"** to go live.
5. Click **"End Class"** when done.

**Live Now:**
- The **"Live Now"** section shows all currently active classes — no enrollment needed to watch live.`,
  },
  {
    keywords: ["library", "book", "borrow", "loan", "return book", "library book", "issue book", "overdue"],
    answer: `Using the Library:

**For Students / Staff:**
- Go to **Library** in the sidebar to browse available books.
- Search by title, author, or category.
- Click a book → **"Borrow"** to request it.
- View your borrowed books under **Library → My Loans**.
- Return a book by going to My Loans → click **"Return"**.

**For Library Staff / Admin:**
1. **Add Books**: Library → Books → Add Book (title, author, category, quantity).
2. **Issue a Book**: Library → Loans → Issue Book → select book and student.
3. **Manage Returns**: Library → Loans → click **"Mark Returned"**.
4. **Overdue Books**: Library → Overdue to see all late returns.
5. **Low Stock Alert**: Library → Low Stock shows books running low.`,
  },
  {
    keywords: ["announcement", "post announcement", "notice", "broadcast", "platform announcement", "school notice", "pinned"],
    answer: `Managing Announcements:

**Viewing Announcements:**
- Go to **Announcements** in the sidebar to see all notices relevant to you.
- Pinned announcements appear at the top.
- Click **"Mark as Read"** to dismiss a notification.

**Posting an Announcement (Admin / CEO / CTO):**
1. Go to Announcements → click **"New Announcement"**.
2. Enter the title and message.
3. Select the **audience**: All Users, School-specific, Role-specific, or Platform-wide.
4. Toggle **"Pin"** to keep it at the top.
5. Click **Publish**.

Note: Only **CEO and CTO** can send platform-wide announcements to all users across all schools.`,
  },
  {
    keywords: ["chat", "message", "messaging", "conversation", "direct message", "send message", "inbox"],
    answer: `Using the Chat System:

**Starting a Conversation:**
1. Go to **Chat / Messages** in the sidebar.
2. Click **"New Conversation"** or the compose icon.
3. Search for a user by name or role.
4. Type your message and press **Enter** or click **Send**.

**Receiving Messages:**
- A badge on the Chat icon shows unread message count.
- Click any conversation to open it and view the full message history.

**Tips:**
- Messages are delivered in real-time.
- You can chat with teachers, parents, admins, or other users within your school.
- Click a user's name in their profile to start a direct message with them.`,
  },
  {
    keywords: ["reset password", "forgot password", "change password", "lost password", "recover account", "can't login", "cannot login"],
    answer: `Resetting or Changing Your Password:

**Forgot Password (from login page):**
1. Go to the **Login page**.
2. Click **"Forgot Password?"**.
3. Enter your **Matricule** (e.g. STU001, TCH005).
4. A password reset link will be sent to your registered email address.
5. Click the link in the email and set a new password.

**Change Password (when logged in):**
1. Go to your **Profile** (top-right menu).
2. Scroll to the **Change Password** section.
3. Enter your current password, then your new password twice.
4. Click **Save Changes**.

If you don't have access to your registered email, contact your school administrator.`,
  },
  {
    keywords: ["add school", "manage school", "school list", "create school", "school status", "toggle school", "school admin"],
    answer: `Managing Schools (CEO / CTO / SUPER ADMIN):

**View All Schools:**
- Go to **Schools** in the sidebar to see all registered schools.
- Each school shows its status (Active/Inactive), admin contact, and student count.

**Add a New School:**
1. Click **"Add School"** on the Schools page.
2. Fill in: School Name, Address, Contact Email, Phone, and assign a School Admin.
3. Click **Save** — the school is created and the assigned admin receives login credentials.

**Activate / Deactivate a School:**
- Open the school → click **"Toggle Status"** to activate or deactivate it.
- Inactive schools cannot log in until reactivated.

**Edit School Settings:**
- Open a school → **Settings** to update the school's branding, timezone, or contact info.`,
  },
  {
    keywords: ["platform setting", "configure platform", "platform name", "platform logo", "upload logo", "branding", "platform fee"],
    answer: `Configuring Platform Settings (CEO / CTO):

**Access Platform Settings:**
- Go to **Settings → Platform Settings** in the sidebar.

**Update Platform Name & Logo:**
1. In the **Branding** tab, enter the platform name.
2. Click **"Upload Logo"** to select an image from your device.
3. The logo is uploaded to the server and displayed on the login page and header.
4. Click **Save Changes**.

**Platform Fees:**
- Go to the **Fees** tab to configure registration/subscription fees by role.
- Click **Add Fee** or edit existing fees.

**Public Events:**
- Manage public-facing events shown on the platform's landing page from the **Events** tab.

**Tutorials:**
- Manage tutorial video links in the **Tutorials** tab for each user role.`,
  },
  {
    keywords: ["report", "statistic", "stats", "overview", "dashboard", "analytics", "performance", "insight", "summary"],
    answer: `Viewing Reports & Statistics:

**Dashboard Overview:**
- The **Dashboard home** shows your key metrics at a glance — students, attendance rate, revenue, active schools, etc.

**Detailed Reports by Module:**
- **Grades**: Go to Grades → Class Results or Annual Results for full performance reports.
- **Attendance**: Go to Attendance → Class Report for detailed attendance summaries.
- **Fees**: Go to Fees → Revenue Report for financial summaries.
- **Library**: Go to Library to see loan statistics and overdue books.

**Platform-Wide Stats (Executives):**
- The Executive Dashboard shows platform-wide stats: total schools, users, revenue, and more.
- Click into each stat card for a drill-down view.

**Exporting:**
- Most report pages have a **Download** or **Export** button to save data as PDF or CSV.`,
  },
  {
    keywords: ["user", "manage user", "add user", "role", "permission", "staff", "teacher", "admin", "update role", "license"],
    answer: `Managing Users (School Admin / CEO / CTO):

**View Users:**
- Go to **Users** in the sidebar to see all users in your school (or platform-wide for executives).
- Filter by role: Teacher, Student, Parent, Staff, etc.

**Add a New User:**
1. Click **"Add User"** on the Users page.
2. Fill in the name, email, role, and school.
3. The system generates a matricule and sends login credentials by email.

**Change a User's Role:**
- Open the user's profile → click **"Update Role"** and select the new role.

**Toggle License:**
- Open the user → click **"Toggle License"** to activate or suspend their account access.

**Founders (Executives Only):**
- Manage platform founders and their share allocations under **Users → Founders**.`,
  },
];

const GREETING_KEYWORDS = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy", "help"];
const THANKS_KEYWORDS = ["thank", "thanks", "thank you", "awesome", "great", "perfect", "helpful"];

function getStaticReply(input: string): string {
  const lower = input.toLowerCase();

  if (GREETING_KEYWORDS.some((k) => lower.includes(k))) {
    return `Hello! I'm the EduIgnite Platform Guide. I can help you learn how to use any feature of the platform.

Try asking me about:
- Updating your profile or password
- Managing students, grades, or attendance
- Fees and payments
- Live classes and the library
- Platform settings and school management

Or click one of the quick-topic buttons below!`;
  }

  if (THANKS_KEYWORDS.some((k) => lower.includes(k))) {
    return `You're welcome! If you have any other questions about using EduIgnite, feel free to ask. I'm always here to help!`;
  }

  // Match knowledge base
  const matches = KNOWLEDGE_BASE.filter((entry) =>
    entry.keywords.some((kw) => lower.includes(kw))
  );

  if (matches.length === 1) {
    return matches[0].answer;
  }

  if (matches.length > 1) {
    // Return the best match (most keyword hits)
    const scored = matches.map((m) => ({
      entry: m,
      score: m.keywords.filter((kw) => lower.includes(kw)).length,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].entry.answer;
  }

  return `I'm not sure I have a specific answer for that, but here's what I can help you with:

${FAQ_TOPICS.map((t) => `• ${t.label}`).join("\n")}

Try rephrasing your question, or click one of the quick-topic buttons to learn about a specific feature.`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiAssistantPage() {
  const { user } = useAuth();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi${user?.name ? ` ${user.name.split(" ")[0]}` : ""}! I'm the **EduIgnite Platform Guide**. I can answer questions about how to use any feature of this platform — no external AI needed.

Ask me anything, or click a quick-topic button below to get started!`,
      ts: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 80);
  };

  const sendMessage = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg || isTyping) return;

      setChatInput("");
      setChatMessages((prev) => [...prev, { role: "user", content: msg, ts: Date.now() }]);
      scrollToBottom();
      setIsTyping(true);

      // Simulate a short "thinking" delay for natural feel
      setTimeout(() => {
        const reply = getStaticReply(msg);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply, ts: Date.now() },
        ]);
        setIsTyping(false);
        scrollToBottom();
      }, 400);
    },
    [isTyping]
  );

  const handleSend = () => sendMessage(chatInput);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple markdown-like renderer (bold **text**)
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-2">
          <div className="p-2 bg-primary rounded-xl shadow-lg">
            <Sparkles className="w-6 h-6 text-secondary fill-secondary/20" />
          </div>
          Platform Guide
        </h1>
        <p className="text-muted-foreground mt-1">
          Interactive help &amp; how-to guide for EduIgnite
        </p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Quick Topics Sidebar */}
        <div className="hidden lg:flex flex-col w-56 shrink-0 gap-2">
          <Card className="border-none shadow-lg flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                Quick Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <ScrollArea className="h-full max-h-[calc(100vh-280px)]">
                <div className="space-y-1">
                  {FAQ_TOPICS.map((topic) => (
                    <Button
                      key={topic.label}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5"
                      onClick={() => sendMessage(topic.prompt)}
                    >
                      <ChevronRight className="w-3 h-3 mr-1 shrink-0" />
                      {topic.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Window */}
        <Card className="flex-1 flex flex-col border-none shadow-lg min-h-0">
          <CardHeader className="border-b shrink-0 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-primary" />
                EduIgnite Platform Guide
              </CardTitle>
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                Online
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Ask me how to use any feature of the platform
            </CardDescription>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={chatScrollRef as any}>
            <div className="space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.ts}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-accent/50 text-foreground rounded-bl-sm border border-primary/10"
                    )}
                  >
                    {renderContent(msg.content)}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-accent/50 border border-primary/10 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary/40" />
                    <span className="text-xs text-muted-foreground">Thinking…</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick topic chips (mobile) */}
          <div className="lg:hidden px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
            {FAQ_TOPICS.slice(0, 6).map((topic) => (
              <Button
                key={topic.label}
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-7 rounded-full border-primary/30 text-primary"
                onClick={() => sendMessage(topic.prompt)}
              >
                {topic.label}
              </Button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any EduIgnite feature…"
                className="flex-1 bg-accent/30 border-none rounded-2xl h-11 text-sm"
                disabled={isTyping}
              />
              <Button
                onClick={handleSend}
                disabled={!chatInput.trim() || isTyping}
                size="icon"
                className="h-11 w-11 rounded-2xl bg-primary text-white shadow-lg shrink-0"
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
