
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "fr";

interface TranslationDict {
  [key: string]: {
    en: string;
    fr: string;
  };
}

const translations: TranslationDict = {
  dashboard: { en: "Dashboard", fr: "Tableau de bord" },
  students: { en: "Students", fr: "Élèves" },
  staff: { en: "Staff", fr: "Personnel" },
  courses: { en: "My Subjects", fr: "Mes Matières" },
  grades: { en: "Report Card", fr: "Bulletin de Notes" },
  attendance: { en: "Attendance", fr: "Présences" },
  aiAssistant: { en: "AI Assistant", fr: "Assistant IA" },
  aiFeedback: { en: "Feedback", fr: "Feedback" },
  schedule: { en: "Schedule", fr: "Emploi du temps" },
  schools: { en: "Schools", fr: "Écoles" },
  feedback: { en: "Feedback", fr: "Feedback" },
  announcements: { en: "Annonces", fr: "Annonces" },
  logout: { en: "Logout", fr: "Déconnexion" },
  welcome: { en: "Welcome back", fr: "Bon retour" },
  myChildren: { en: "My Children", fr: "Mes Enfants" },
  platformOverview: { en: "Platform Overview", fr: "Aperçu de la plateforme" },
  overview: { en: "Overview", fr: "Vue d'ensemble" },
  save: { en: "Save", fr: "Enregistrer" },
  cancel: { en: "Cancel", fr: "Annuler" },
  login: { en: "Login", fr: "Connexion" },
  selectRole: { en: "Select your role", fr: "Sélectionnez votre rôle" },
  email: { en: "Email Address", fr: "Adresse Email" },
  password: { en: "Password", fr: "Mot de passe" },
  signIn: { en: "Sign In", fr: "Se Connecter" },
  addSchool: { en: "Add School", fr: "Ajouter une École" },
  viewMap: { en: "View Map", fr: "Voir la Carte" },
  sendAnnouncement: { en: "Send Announcement", fr: "Envoyer une Annonce" },
  allSchools: { en: "All Schools", fr: "Toutes les Écoles" },
  documents: { en: "Documents", fr: "Documents" },
  download: { en: "Download", fr: "Télécharger" },
  reportCard: { en: "Report Card", fr: "Bulletin de Notes" },
  idCard: { en: "ID Card", fr: "Carte d'Identité" },
  idCards: { en: "ID Cards", fr: "Cartes d'Identité" },
  receipt: { en: "Receipt", fr: "Reçu de Paiement" },
  academicYear: { en: "Academic Year", fr: "Année Académique" },
  fees: { en: "Fees & Receipts", fr: "Frais & Reçus" },
  chat: { en: "Live Chat", fr: "Chat en direct" },
  noConversations: { en: "No conversations yet", fr: "Aucune conversation pour le moment" },
  selectContact: { en: "Select a contact to start chatting", fr: "Sélectionnez un contact pour commencer à discuter" },
  attendanceRecords: { en: "Attendance Records", fr: "Registres de présence" },
  present: { en: "Present", fr: "Présent" },
  absent: { en: "Absent", fr: "Absent" },
  late: { en: "Late", fr: "Retard" },
  viewDetails: { en: "View Details", fr: "Voir Détails" },
  createAccount: { en: "Create Account", fr: "Créer un Compte" },
  matricule: { en: "Matricule / ID", fr: "Matricule / ID" },
  confirmPassword: { en: "Confirm Password", fr: "Confirmer le mot de passe" },
  alreadyHaveAccount: { en: "Already have an account?", fr: "Déjà un compte ?" },
  dontHaveAccount: { en: "Don't have an account?", fr: "Pas encore de compte ?" },
  register: { en: "Register", fr: "S'inscrire" },
  profile: { en: "Profile", fr: "Profil" },
  editProfile: { en: "Edit Profile", fr: "Modifier le Profil" },
  personalInfo: { en: "Personal Information", fr: "Informations Personnelles" },
  fullName: { en: "Full Name", fr: "Nom Complet" },
  changePassword: { en: "Change Password", fr: "Changer le mot de passe" },
  currentPassword: { en: "Current Password", fr: "Mot de passe actuel" },
  newPassword: { en: "New Password", fr: "Nouveau mot de passe" },
  updatePassword: { en: "Update Password", fr: "Mettre à jour le mot de passe" },
  changesSaved: { en: "Changes Saved", fr: "Changements Enregistrés" },
  profileUpdateSuccess: { en: "Your profile has been updated successfully.", fr: "Votre profil a été mi à jour avec succès." },
  addSubject: { en: "Add Optional Subject", fr: "Ajouter une Matière Facultative" },
  viewMaterials: { en: "View Materials", fr: "Voir les Supports" },
  materials: { en: "Course Materials", fr: "Supports de Cours" },
  availableSubjects: { en: "Available Optional Subjects", fr: "Matières Facultatives Disponibles" },
  exams: { en: "Exams & Schedules", fr: "Examens & Calendrier" },
  takeExam: { en: "Take Exam", fr: "Passer l'Examen" },
  createExam: { en: "Create Exam", fr: "Créer un Examen" },
  examResults: { en: "Exam Results", fr: "Résultats d'Examen" },
  certificate: { en: "Certificate", fr: "Certificat" },
  score: { en: "Score", fr: "Score" },
  duration: { en: "Duration", fr: "Durée" },
  startTime: { en: "Start Time", fr: "Heure de Début" },
  endTime: { en: "End Time", fr: "Heure de Fin" },
  minutes: { en: "Minutes", fr: "Minutes" },
  questions: { en: "Questions", fr: "Questions" },
  submitExam: { en: "Submit Exam", fr: "Soumettre l'Examen" },
  passed: { en: "Passed", fr: "Réussi" },
  failed: { en: "Failed", fr: "Échoué" },
  assignments: { en: "Assignments", fr: "Devoirs" },
  upcoming: { en: "Upcoming", fr: "À venir" },
  due: { en: "Due", fr: "À rendre" },
  submitted: { en: "Submitted", fr: "Soumis" },
  graded: { en: "Graded", fr: "Noté" },
  submitAssignment: { en: "Submit Assignment", fr: "Rendre le Devoir" },
  dueDate: { en: "Due Date", fr: "Date limite" },
  bursar: { en: "Bursar", fr: "Économe" },
  librarian: { en: "Librarian", fr: "Bibliothécaire" },
  library: { en: "Library", fr: "Bibliothèque" },
  catalog: { en: "Catalog", fr: "Catalogue" },
  borrow: { en: "Borrow Book", fr: "Emprunter" },
  borrowed: { en: "My Borrowed Books", fr: "Mes Livres Empruntés" },
  libraryHistory: { en: "Library History", fr: "Historique Bibliothèque" },
  returnDate: { en: "Return Date", fr: "Date de Retour" },
  dateBorrowed: { en: "Date Borrowed", fr: "Date d'Emprunt" },
  dateReturned: { en: "Date Returned", fr: "Date de Retour" },
  available: { en: "Available", fr: "Disponible" },
  searchBooks: { en: "Search for books...", fr: "Rechercher un livre..." },
  collectionReceipt: { en: "Collection Receipt", fr: "Reçu de Collection" },
  collectionCode: { en: "Collection Code", fr: "Code de Collection" },
  settings: { en: "School Settings", fr: "Paramètres de l'École" },
  platformSettings: { en: "Platform Settings", fr: "Paramètres de la Plateforme" },
  founders: { en: "Founders", fr: "Fondateurs" },
  supportRegistry: { en: "Support Ledger", fr: "Registre de Soutien" },
  forgotPassword: { en: "Forgot Password?", fr: "Mot de passe oublié ?" },
  resetPassword: { en: "Reset Password", fr: "Réinitialiser" },
  backToLogin: { en: "Back to Login", fr: "Retour à la connexion" },
  verificationId: { en: "Verification ID", fr: "ID de vérification" },
  enterOtp: { en: "Enter OTP Code", fr: "Entrer le code OTP" },
  verifyOtp: { en: "Verify Code", fr: "Vérifier le code" },
  otpSent: { en: "A 6-digit code was sent to your email.", fr: "Un code à 6 chiffres a été envoyé à votre email." },
  confirmNewPassword: { en: "Confirm New Password", fr: "Confirmer le nouveau mot de passe" },
  updatePassword: { en: "Update Password", fr: "Mettre à jour le mot de passe" },
  changesSaved: { en: "Changes Saved", fr: "Changements Enregistrés" },
  profileUpdateSuccess: { en: "Your profile has been updated successfully.", fr: "Votre profil a été mi à jour avec succès." },
  addSubject: { en: "Add Optional Subject", fr: "Ajouter une Matière Facultative" },
  viewMaterials: { en: "View Materials", fr: "Voir les Supports" },
  materials: { en: "Course Materials", fr: "Supports de Cours" },
  availableSubjects: { en: "Available Optional Subjects", fr: "Matières Facultatives Disponibles" },
  exams: { en: "Exams & Schedules", fr: "Examens & Calendrier" },
  takeExam: { en: "Take Exam", fr: "Passer l'Examen" },
  createExam: { en: "Create Exam", fr: "Créer un Examen" },
  examResults: { en: "Exam Results", fr: "Résultats d'Examen" },
  certificate: { en: "Certificate", fr: "Certificat" },
  score: { en: "Score", fr: "Score" },
  duration: { en: "Duration", fr: "Durée" },
  startTime: { en: "Start Time", fr: "Heure de Début" },
  endTime: { en: "End Time", fr: "Heure de Fin" },
  minutes: { en: "Minutes", fr: "Minutes" },
  questions: { en: "Questions", fr: "Questions" },
  submitExam: { en: "Submit Exam", fr: "Soumettre l'Examen" },
  passed: { en: "Passed", fr: "Réussi" },
  failed: { en: "Failed", fr: "Échoué" },
  assignments: { en: "Assignments", fr: "Devoirs" },
  upcoming: { en: "Upcoming", fr: "À venir" },
  due: { en: "Due", fr: "À rendre" },
  submitted: { en: "Submitted", fr: "Soumis" },
  graded: { en: "Graded", fr: "Noté" },
  submitAssignment: { en: "Submit Assignment", fr: "Rendre le Devoir" },
  dueDate: { en: "Due Date", fr: "Date limite" },
  bursar: { en: "Bursar", fr: "Économe" },
  librarian: { en: "Librarian", fr: "Bibliothécaire" },
  library: { en: "Library", fr: "Bibliothèque" },
  catalog: { en: "Catalog", fr: "Catalogue" },
  borrow: { en: "Borrow Book", fr: "Emprunter" },
  borrowed: { en: "My Borrowed Books", fr: "Mes Livres Empruntés" },
  libraryHistory: { en: "Library History", fr: "Historique Bibliothèque" },
  returnDate: { en: "Return Date", fr: "Date de Retour" },
  dateBorrowed: { en: "Date Borrowed", fr: "Date d'Emprunt" },
  dateReturned: { en: "Date Returned", fr: "Date de Retour" },
  available: { en: "Available", fr: "Disponible" },
  searchBooks: { en: "Search for books...", fr: "Rechercher un livre..." },
  collectionReceipt: { en: "Collection Receipt", fr: "Reçu de Collection" },
  collectionCode: { en: "Collection Code", fr: "Code de Collection" },
  settings: { en: "School Settings", fr: "Paramètres de l'École" },
  platformSettings: { en: "Platform Settings", fr: "Paramètres de la Plateforme" },
  founders: { en: "Founders", fr: "Fondateurs" },
  supportRegistry: { en: "Support Ledger", fr: "Registre de Soutien" },
  forgotPassword: { en: "Forgot Password?", fr: "Mot de passe oublié ?" },
  resetPassword: { en: "Reset Password", fr: "Réinitialiser" },
  backToLogin: { en: "Back to Login", fr: "Retour à la connexion" },
  verificationId: { en: "Verification ID", fr: "ID de vérification" },
  enterOtp: { en: "Enter OTP Code", fr: "Entrer le code OTP" },
  verifyOtp: { en: "Verify Code", fr: "Vérifier le code" },
  otpSent: { en: "A 6-digit code was sent to your email.", fr: "Un code à 6 chiffres a été envoyé à votre email." },
  confirmNewPassword: { en: "Confirm New Password", fr: "Confirmer le nouveau mot de passe" },
  updatePassword: { en: "Update Password", fr: "Mettre à jour le mot de passe" },
  changesSaved: { en: "Changes Saved", fr: "Changements Enregistrés" },
  profileUpdateSuccess: { en: "Your profile has been updated successfully.", fr: "Votre profil a été mi à jour avec succès." },
  onlineClasses: { en: "Online Classes", fr: "Classes en Ligne" },
  transcript: { en: "Transcript", fr: "Relevé de Notes" },
  draftTranscript: { en: "Draft Transcript", fr: "Relevé de Notes Provisoire" },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("fr");

  useEffect(() => {
    const savedLang = localStorage.getItem("edu-nexus-lang") as Language;
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("edu-nexus-lang", lang);
  };

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language];
  };

  return (
    <div lang={language}>
      <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
        {children}
      </I18nContext.Provider>
    </div>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) throw new Error("useI18n must be used within an I18nProvider");
  return context;
};
