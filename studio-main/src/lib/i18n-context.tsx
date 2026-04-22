"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "fr";

interface TranslationEntry {
  en: string;
  fr: string;
}

type TranslationDict = Record<string, TranslationEntry>;

const translations: TranslationDict = {
  dashboard: { en: "Dashboard", fr: "Tableau de bord" },
  students: { en: "Students", fr: "Eleves" },
  staff: { en: "Staff", fr: "Personnel" },
  courses: { en: "My Subjects", fr: "Mes matieres" },
  grades: { en: "Report Card", fr: "Bulletin de notes" },
  attendance: { en: "Attendance", fr: "Presences" },
  aiAssistant: { en: "AI Assistant", fr: "Assistant IA" },
  aiFeedback: { en: "Feedback", fr: "Feedback" },
  schedule: { en: "Schedule", fr: "Emploi du temps" },
  schools: { en: "Schools", fr: "Ecoles" },
  feedback: { en: "Feedback", fr: "Feedback" },
  announcements: { en: "Announcements", fr: "Annonces" },
  logout: { en: "Logout", fr: "Deconnexion" },
  welcome: { en: "Welcome back", fr: "Bon retour" },
  myChildren: { en: "My Children", fr: "Mes enfants" },
  platformOverview: { en: "Platform Overview", fr: "Apercu de la plateforme" },
  overview: { en: "Overview", fr: "Vue d'ensemble" },
  save: { en: "Save", fr: "Enregistrer" },
  cancel: { en: "Cancel", fr: "Annuler" },
  login: { en: "Login", fr: "Connexion" },
  selectRole: { en: "Select your role", fr: "Selectionnez votre role" },
  email: { en: "Email Address", fr: "Adresse email" },
  password: { en: "Password", fr: "Mot de passe" },
  signIn: { en: "Sign In", fr: "Se connecter" },
  activateAccountTitle: { en: "Activate Account", fr: "Activer le compte" },
  secureAccessPortal: { en: "Secure Access Portal", fr: "Portail d'acces securise" },
  highFidelityAccessPortal: { en: "High-Fidelity Access Portal", fr: "Portail d'acces haute fidelite" },
  welcomeBack: { en: "Welcome back", fr: "Bon retour" },
  connectedToLiveBackend: { en: "Connected to live backend.", fr: "Connecte au backend en direct." },
  loginFailedTryAgain: { en: "Login failed. Please try again.", fr: "La connexion a echoue. Veuillez reessayer." },
  authFailed: { en: "Authentication Failed", fr: "Echec de l'authentification" },
  passwordMismatch: { en: "Password Mismatch", fr: "Les mots de passe ne correspondent pas" },
  passwordsDoNotMatch: { en: "The passwords provided do not match.", fr: "Les mots de passe fournis ne correspondent pas." },
  invalidCredentials: { en: "Invalid credentials", fr: "Identifiants invalides" },
  accountActivated: { en: "Account activated successfully.", fr: "Compte active avec succes." },
  accountActivatedDesc: { en: "You can now sign in with your matricule and password.", fr: "Vous pouvez maintenant vous connecter avec votre matricule et votre mot de passe." },
  checkEmailForCode: { en: "Check your email for the 6-digit code.", fr: "Verifiez votre email pour le code a 6 chiffres." },
  identifyRecord: { en: "Identify Record", fr: "Identifier le dossier" },
  verifySecurity: { en: "Verify Security", fr: "Verifier la securite" },
  commitReset: { en: "Commit Reset", fr: "Valider la reinitialisation" },
  openDashboard: { en: "Open Dashboard", fr: "Ouvrir le tableau de bord" },
  activating: { en: "Activating...", fr: "Activation..." },
  authenticating: { en: "Authenticating...", fr: "Authentification..." },
  processing: { en: "Processing...", fr: "Traitement..." },
  activateAccountCta: { en: "Activate Account", fr: "Activer le compte" },
  verifiedCorporateEmail: { en: "Verified Corporate Email", fr: "Email professionnel verifie" },
  confirmPasswordLabel: { en: "Confirm Password", fr: "Confirmer le mot de passe" },
  sixDigitVerificationCode: { en: "6-Digit Verification Code", fr: "Code de verification a 6 chiffres" },
  codeExpires: { en: "Code expires in 05:00", fr: "Le code expire dans 05:00" },
  identityVerified: { en: "Identity Verified", fr: "Identite verifiee" },
  resetIdentityDesc: { en: "Your account has been identified. Please define your new secure credentials below.", fr: "Votre compte a ete identifie. Veuillez definir vos nouveaux identifiants securises ci-dessous." },
  newSecurePassword: { en: "New Secure Password", fr: "Nouveau mot de passe securise" },
  confirmNewPasswordLabel: { en: "Confirm New Password", fr: "Confirmer le nouveau mot de passe" },
  credentialsUpdated: { en: "Credentials Updated", fr: "Identifiants mis a jour" },
  credentialsUpdatedDesc: { en: "Your identity records have been synchronized. You may now proceed to sign in with your updated credentials.", fr: "Vos informations d'identite ont ete synchronisees. Vous pouvez maintenant vous connecter avec vos identifiants mis a jour." },
  returnToSignIn: { en: "Return to Secure Sign In", fr: "Retour a la connexion securisee" },
  visitCommunityPortal: { en: "Visit Community Portal", fr: "Visiter le portail communautaire" },
  addSchool: { en: "Add School", fr: "Ajouter une ecole" },
  viewMap: { en: "View Map", fr: "Voir la carte" },
  sendAnnouncement: { en: "Send Announcement", fr: "Envoyer une annonce" },
  allSchools: { en: "All Schools", fr: "Toutes les ecoles" },
  documents: { en: "Documents", fr: "Documents" },
  download: { en: "Download", fr: "Telecharger" },
  reportCard: { en: "Report Card", fr: "Bulletin de notes" },
  idCard: { en: "ID Card", fr: "Carte d'identite" },
  idCards: { en: "ID Cards", fr: "Cartes d'identite" },
  receipt: { en: "Receipt", fr: "Recu" },
  academicYear: { en: "Academic Year", fr: "Annee academique" },
  fees: { en: "Fees & Receipts", fr: "Frais et recus" },
  chat: { en: "Live Chat", fr: "Chat en direct" },
  noConversations: { en: "No conversations yet", fr: "Aucune conversation pour le moment" },
  selectContact: { en: "Select a contact to start chatting", fr: "Selectionnez un contact pour commencer" },
  present: { en: "Present", fr: "Present" },
  absent: { en: "Absent", fr: "Absent" },
  late: { en: "Late", fr: "Retard" },
  viewDetails: { en: "View Details", fr: "Voir details" },
  createAccount: { en: "Create Account", fr: "Creer un compte" },
  matricule: { en: "Matricule / ID", fr: "Matricule / ID" },
  confirmPassword: { en: "Confirm Password", fr: "Confirmer le mot de passe" },
  alreadyHaveAccount: { en: "Already have an account?", fr: "Deja un compte ?" },
  dontHaveAccount: { en: "Don't have an account?", fr: "Pas encore de compte ?" },
  register: { en: "Register", fr: "S'inscrire" },
  profile: { en: "Profile", fr: "Profil" },
  editProfile: { en: "Edit Profile", fr: "Modifier le profil" },
  personalInfo: { en: "Personal Information", fr: "Informations personnelles" },
  fullName: { en: "Full Name", fr: "Nom complet" },
  changePassword: { en: "Change Password", fr: "Changer le mot de passe" },
  currentPassword: { en: "Current Password", fr: "Mot de passe actuel" },
  newPassword: { en: "New Password", fr: "Nouveau mot de passe" },
  updatePassword: { en: "Update Password", fr: "Mettre a jour le mot de passe" },
  changesSaved: { en: "Changes Saved", fr: "Changements enregistres" },
  profileUpdateSuccess: { en: "Your profile has been updated successfully.", fr: "Votre profil a ete mis a jour avec succes." },
  addSubject: { en: "Add Optional Subject", fr: "Ajouter une matiere facultative" },
  viewMaterials: { en: "View Materials", fr: "Voir les supports" },
  materials: { en: "Course Materials", fr: "Supports de cours" },
  availableSubjects: { en: "Available Optional Subjects", fr: "Matieres facultatives disponibles" },
  exams: { en: "Exams & Schedules", fr: "Examens et calendrier" },
  takeExam: { en: "Take Exam", fr: "Passer l'examen" },
  createExam: { en: "Create Exam", fr: "Creer un examen" },
  examResults: { en: "Exam Results", fr: "Resultats d'examen" },
  certificate: { en: "Certificate", fr: "Certificat" },
  score: { en: "Score", fr: "Score" },
  duration: { en: "Duration", fr: "Duree" },
  startTime: { en: "Start Time", fr: "Heure de debut" },
  endTime: { en: "End Time", fr: "Heure de fin" },
  minutes: { en: "Minutes", fr: "Minutes" },
  questions: { en: "Questions", fr: "Questions" },
  submitExam: { en: "Submit Exam", fr: "Soumettre l'examen" },
  passed: { en: "Passed", fr: "Reussi" },
  failed: { en: "Failed", fr: "Echoue" },
  assignments: { en: "Assignments", fr: "Devoirs" },
  upcoming: { en: "Upcoming", fr: "A venir" },
  due: { en: "Due", fr: "A rendre" },
  submitted: { en: "Submitted", fr: "Soumis" },
  graded: { en: "Graded", fr: "Note" },
  submitAssignment: { en: "Submit Assignment", fr: "Rendre le devoir" },
  dueDate: { en: "Due Date", fr: "Date limite" },
  bursar: { en: "Bursar", fr: "Econome" },
  librarian: { en: "Librarian", fr: "Bibliothecaire" },
  library: { en: "Library", fr: "Bibliotheque" },
  catalog: { en: "Catalog", fr: "Catalogue" },
  borrow: { en: "Borrow Book", fr: "Emprunter" },
  borrowed: { en: "My Borrowed Books", fr: "Mes livres empruntes" },
  libraryHistory: { en: "Library History", fr: "Historique bibliotheque" },
  returnDate: { en: "Return Date", fr: "Date de retour" },
  dateBorrowed: { en: "Date Borrowed", fr: "Date d'emprunt" },
  dateReturned: { en: "Date Returned", fr: "Date de retour" },
  available: { en: "Available", fr: "Disponible" },
  searchBooks: { en: "Search for books...", fr: "Rechercher un livre..." },
  collectionReceipt: { en: "Collection Receipt", fr: "Recu de collection" },
  collectionCode: { en: "Collection Code", fr: "Code de collection" },
  settings: { en: "School Settings", fr: "Parametres de l'ecole" },
  platformSettings: { en: "Platform Settings", fr: "Parametres de la plateforme" },
  founders: { en: "Founders", fr: "Fondateurs" },
  supportRegistry: { en: "Support Ledger", fr: "Registre de soutien" },
  forgotPassword: { en: "Forgot Password?", fr: "Mot de passe oublie ?" },
  resetPassword: { en: "Reset Password", fr: "Reinitialiser" },
  backToLogin: { en: "Back to Login", fr: "Retour a la connexion" },
  verificationId: { en: "Verification ID", fr: "ID de verification" },
  enterOtp: { en: "Enter OTP Code", fr: "Entrer le code OTP" },
  verifyOtp: { en: "Verify Code", fr: "Verifier le code" },
  otpSent: { en: "A 6-digit code was sent to your email.", fr: "Un code a 6 chiffres a ete envoye a votre email." },
  confirmNewPassword: { en: "Confirm New Password", fr: "Confirmer le nouveau mot de passe" },
  onlineClasses: { en: "Online Classes", fr: "Classes en ligne" },
  transcript: { en: "Transcript", fr: "Releve de notes" },
  draftTranscript: { en: "Draft Transcript", fr: "Releve de notes provisoire" },
  workspaceLanguage: { en: "Workspace Language", fr: "Langue de l'espace" },
};

const backendTextTranslations: TranslationDict = {
  "network error": { en: "Network error", fr: "Erreur reseau" },
  "invalid credentials": { en: "Invalid credentials", fr: "Identifiants invalides" },
  "wrong password": { en: "Wrong password", fr: "Mot de passe incorrect" },
  "matricule does not exist": { en: "Matricule does not exist", fr: "Le matricule n'existe pas" },
  "you are not allowed to carry out this operation": {
    en: "You are not allowed to carry out this operation",
    fr: "Vous n'etes pas autorise a effectuer cette operation",
  },
  "failed to load conversations": { en: "Failed to load conversations", fr: "Impossible de charger les conversations" },
  "failed to load messages": { en: "Failed to load messages", fr: "Impossible de charger les messages" },
  "failed to send feedback": { en: "Failed to send feedback.", fr: "Impossible d'envoyer le feedback." },
  "failed to resolve feedback": { en: "Failed to resolve feedback.", fr: "Impossible de resoudre le feedback." },
  "error": { en: "Error", fr: "Erreur" },
  "feedback sent": { en: "Feedback Sent", fr: "Feedback envoye" },
  "feedback resolved": { en: "Feedback Resolved", fr: "Feedback resolu" },
  "the platform administrator has received your message": {
    en: "The platform administrator has received your message.",
    fr: "L'administrateur de la plateforme a recu votre message.",
  },
  "ticket has been marked as resolved": {
    en: "Ticket has been marked as resolved.",
    fr: "Le ticket a ete marque comme resolu.",
  },
  "pending": { en: "Pending", fr: "En attente" },
  "resolved": { en: "Resolved", fr: "Resolu" },
  "in progress": { en: "In Progress", fr: "En cours" },
  "technical error": { en: "Technical Error", fr: "Erreur technique" },
  "feature suggestion": { en: "Feature Suggestion", fr: "Suggestion de fonctionnalite" },
  "general appreciation": { en: "General Appreciation", fr: "Appreciation generale" },
  "billing & subscription": { en: "Billing & Subscription", fr: "Facturation et abonnement" },
  "administrative request": { en: "Administrative Request", fr: "Demande administrative" },
  "other": { en: "Other", fr: "Autre" },
  "no messages yet": { en: "No messages yet", fr: "Aucun message pour le moment" },
  "online": { en: "Online", fr: "En ligne" },
  "offline": { en: "Offline", fr: "Hors ligne" },
  "connected": { en: "Connected", fr: "Connecte" },
  "live": { en: "Live", fr: "En direct" },
  "websocket error": { en: "WebSocket Error", fr: "Erreur WebSocket" },
  "active sync": { en: "Active sync", fr: "Synchronisation active" },
  "sync pending": { en: "Sync pending", fr: "Synchronisation en attente" },
  "group sync active": { en: "Group sync active", fr: "Synchronisation du groupe active" },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translateText: (value?: string | null) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("edu-nexus-lang") as Language | null;
    if (savedLang === "en" || savedLang === "fr") {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("edu-nexus-lang", lang);
  };

  const t = (key: string) => translations[key]?.[language] ?? key;
  const translateText = (value?: string | null) => {
    if (!value) return "";
    const normalized = value.trim().toLowerCase().replace(/[.!?]+$/, "");
    return backendTextTranslations[normalized]?.[language] ?? value;
  };

  return (
    <div lang={language}>
      <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t, translateText }}>
        {children}
      </I18nContext.Provider>
    </div>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
