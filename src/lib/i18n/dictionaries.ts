export interface FormDictionary {
  // Navigation & Steps
  stepIndicator: string; // e.g. "Step {current} of {total}"
  nextStep: string;
  previousStep: string;
  submitButton: string;
  submittingButton: string;
  chooseLanguage: string;
  requiredBadge: string;
  optionalBadge: string;

  // Media & Input Types
  chooseFormat: string;
  videoOption: string;
  videoOptionDesc: string;
  audioOption: string;
  audioOptionDesc: string;
  textOption: string;
  textOptionDesc: string;

  // Standard Fields
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  companyLabel: string;
  companyPlaceholder: string;
  jobTitleLabel: string;
  jobTitlePlaceholder: string;
  websiteLabel: string;
  websitePlaceholder: string;
  ratingLabel: string;
  feedbackLabel: string;
  feedbackPlaceholder: string;

  // Consent
  consentHeading: string;
  consentCheckboxDefault: string;
  consentNotice: string;

  // Recording Controls
  recordVideoPrompt: string;
  uploadVideoPrompt: string;
  recordAudioPrompt: string;
  uploadAudioPrompt: string;
  retakeMedia: string;
  confirmMedia: string;

  // Thank You / Completion
  thankYouHeading: string;
  thankYouDefaultMessage: string;
  closeWindow: string;

  // Status Screens
  pausedTitle: string;
  pausedMessage: string;
  unpublishedTitle: string;
  unpublishedMessage: string;
  notFoundTitle: string;
  notFoundMessage: string;
  returnHome: string;

  // Validation
  requiredError: string;
  invalidEmailError: string;
  consentRequiredError: string;
}

export const DICTIONARIES: Record<string, FormDictionary> = {
  en: {
    stepIndicator: "Step {current} of {total}",
    nextStep: "Continue",
    previousStep: "Back",
    submitButton: "Submit Testimonial",
    submittingButton: "Submitting...",
    chooseLanguage: "Language",
    requiredBadge: "Required",
    optionalBadge: "Optional",

    chooseFormat: "Choose how you'd like to share your feedback",
    videoOption: "Record Video",
    videoOptionDesc: "Share a short face-to-face video testimonial",
    audioOption: "Record Audio",
    audioOptionDesc: "Speak your thoughts using your microphone",
    textOption: "Write Text",
    textOptionDesc: "Type your review and feedback in writing",

    fullNameLabel: "Your Name",
    fullNamePlaceholder: "e.g. Jane Doe",
    emailLabel: "Email Address",
    emailPlaceholder: "jane@company.com",
    companyLabel: "Company Name",
    companyPlaceholder: "Acme Inc.",
    jobTitleLabel: "Job Title",
    jobTitlePlaceholder: "e.g. Head of Product",
    websiteLabel: "Company Website",
    websitePlaceholder: "https://acme.com",
    ratingLabel: "Your Rating",
    feedbackLabel: "Your Feedback",
    feedbackPlaceholder: "What specific problems did this solve? What do you love most?",

    consentHeading: "Publication Consent",
    consentCheckboxDefault: "I grant permission to use my feedback and name for marketing purposes.",
    consentNotice: "We respect your privacy and only share your feedback with your explicit consent.",

    recordVideoPrompt: "Record with Camera",
    uploadVideoPrompt: "Upload Video File",
    recordAudioPrompt: "Record Voice",
    uploadAudioPrompt: "Upload Audio File",
    retakeMedia: "Retake",
    confirmMedia: "Use this recording",

    thankYouHeading: "Thank you for sharing your feedback!",
    thankYouDefaultMessage: "We truly appreciate your time and support.",
    closeWindow: "Done",

    pausedTitle: "Submissions Paused",
    pausedMessage: "This collection form is currently not accepting new submissions. Please check back later.",
    unpublishedTitle: "Form Unpublished",
    unpublishedMessage: "This collection form is currently unpublished by the administrator.",
    notFoundTitle: "Form Not Found",
    notFoundMessage: "The collection form you requested does not exist or the link may have changed.",
    returnHome: "Return to Homepage",

    requiredError: "Please fill in all required fields.",
    invalidEmailError: "Please enter a valid email address.",
    consentRequiredError: "Please accept the publication consent to submit.",
  },

  es: {
    stepIndicator: "Paso {current} de {total}",
    nextStep: "Continuar",
    previousStep: "Atrás",
    submitButton: "Enviar Testimonio",
    submittingButton: "Enviando...",
    chooseLanguage: "Idioma",
    requiredBadge: "Obligatorio",
    optionalBadge: "Opcional",

    chooseFormat: "Elige cómo te gustaría compartir tu opinión",
    videoOption: "Grabar Video",
    videoOptionDesc: "Comparte un breve testimonio en video",
    audioOption: "Grabar Audio",
    audioOptionDesc: "Habla directamente usando tu micrófono",
    textOption: "Escribir Texto",
    textOptionDesc: "Escribe tu reseña y comentarios por escrito",

    fullNameLabel: "Tu Nombre",
    fullNamePlaceholder: "p. ej. María García",
    emailLabel: "Correo Electrónico",
    emailPlaceholder: "maria@empresa.com",
    companyLabel: "Nombre de la Empresa",
    companyPlaceholder: "Acme S.L.",
    jobTitleLabel: "Puesto de Trabajo",
    jobTitlePlaceholder: "p. ej. Directora de Producto",
    websiteLabel: "Sitio Web",
    websitePlaceholder: "https://empresa.com",
    ratingLabel: "Tu Calificación",
    feedbackLabel: "Tu Opinión",
    feedbackPlaceholder: "¿Qué problemas específicos resolvió? ¿Qué es lo que más te gusta?",

    consentHeading: "Consentimiento de Publicación",
    consentCheckboxDefault: "Autorizo el uso de mi testimonio y nombre con fines promocionales.",
    consentNotice: "Respetamos tu privacidad y solo compartimos tu testimonio con tu consentimiento explícito.",

    recordVideoPrompt: "Grabar con Cámara",
    uploadVideoPrompt: "Subir Archivo de Video",
    recordAudioPrompt: "Grabar Voz",
    uploadAudioPrompt: "Subir Archivo de Audio",
    retakeMedia: "Repetir",
    confirmMedia: "Usar esta grabación",

    thankYouHeading: "¡Muchas gracias por tu testimonio!",
    thankYouDefaultMessage: "Agradecemos enormemente tu tiempo y apoyo continuo.",
    closeWindow: "Finalizar",

    pausedTitle: "Respuestas en Pausa",
    pausedMessage: "Este formulario ha pausado temporalmente la recepción de nuevas respuestas.",
    unpublishedTitle: "Formulario No Publicado",
    unpublishedMessage: "Este formulario no está publicado actualmente por el administrador.",
    notFoundTitle: "Formulario No Encontrado",
    notFoundMessage: "El formulario solicitado no existe o el enlace ha cambiado.",
    returnHome: "Volver al Inicio",

    requiredError: "Por favor completa todos los campos obligatorios.",
    invalidEmailError: "Por favor introduce un correo electrónico válido.",
    consentRequiredError: "Debes aceptar el consentimiento de publicación para continuar.",
  },

  fr: {
    stepIndicator: "Étape {current} sur {total}",
    nextStep: "Continuer",
    previousStep: "Retour",
    submitButton: "Envoyer mon Témoignage",
    submittingButton: "Envoi en cours...",
    chooseLanguage: "Langue",
    requiredBadge: "Obligatoire",
    optionalBadge: "Facultatif",

    chooseFormat: "Choisissez comment partager votre retour d'expérience",
    videoOption: "Enregistrer une Vidéo",
    videoOptionDesc: "Partagez un court témoignage vidéo face caméra",
    audioOption: "Enregistrer un Audio",
    audioOptionDesc: "Exprimez-vous au micro en toute simplicité",
    textOption: "Rédiger un Texte",
    textOptionDesc: "Écrivez votre avis et vos commentaires",

    fullNameLabel: "Votre Nom",
    fullNamePlaceholder: "ex. Jean Dupont",
    emailLabel: "Adresse E-mail",
    emailPlaceholder: "jean@entreprise.fr",
    companyLabel: "Nom de l'Entreprise",
    companyPlaceholder: "Acme SAS",
    jobTitleLabel: "Fonction / Rôle",
    jobTitlePlaceholder: "ex. Responsable Produit",
    websiteLabel: "Site Web",
    websitePlaceholder: "https://entreprise.fr",
    ratingLabel: "Votre Note",
    feedbackLabel: "Votre Témoignage",
    feedbackPlaceholder: "Quels problèmes ont été résolus ? Qu'appréciez-vous le plus ?",

    consentHeading: "Consentement de Publication",
    consentCheckboxDefault: "J'autorise l'utilisation de mon témoignage et de mon nom à des fins promotionnelles.",
    consentNotice: "Nous respectons votre vie privée et ne partageons votre avis qu'avec votre consentement.",

    recordVideoPrompt: "Filmer avec la Caméra",
    uploadVideoPrompt: "Téléverser une Vidéo",
    recordAudioPrompt: "Enregistrer la Voix",
    uploadAudioPrompt: "Téléverser un Audio",
    retakeMedia: "Recommencer",
    confirmMedia: "Conserver cet enregistrement",

    thankYouHeading: "Merci beaucoup pour votre témoignage !",
    thankYouDefaultMessage: "Nous apprécions sincèrement votre temps et votre confiance.",
    closeWindow: "Terminer",

    pausedTitle: "Réceptions en Pause",
    pausedMessage: "Ce formulaire n'accepte temporairement plus de nouvelles soumissions.",
    unpublishedTitle: "Formulaire Non Publié",
    unpublishedMessage: "Ce formulaire n'est actuellement pas publié par l'administrateur.",
    notFoundTitle: "Formulaire Introuvable",
    notFoundMessage: "Le formulaire demandé n'existe pas ou le lien a été modifié.",
    returnHome: "Retour à l'Accueil",

    requiredError: "Veuillez remplir tous les champs obligatoires.",
    invalidEmailError: "Veuillez saisir une adresse e-mail valide.",
    consentRequiredError: "Veuillez accepter le consentement de publication pour soumettre.",
  },

  de: {
    stepIndicator: "Schritt {current} von {total}",
    nextStep: "Weiter",
    previousStep: "Zurück",
    submitButton: "Bewertung Absenden",
    submittingButton: "Wird gesendet...",
    chooseLanguage: "Sprache",
    requiredBadge: "Erforderlich",
    optionalBadge: "Optional",

    chooseFormat: "Wählen Sie, wie Sie Ihr Feedback teilen möchten",
    videoOption: "Video aufnehmen",
    videoOptionDesc: "Teilen Sie ein kurzes Video-Testimonial",
    audioOption: "Audio aufnehmen",
    audioOptionDesc: "Sprechen Sie Ihr Feedback per Mikrofon ein",
    textOption: "Text verfassen",
    textOptionDesc: "Verfassen Sie Ihren Erfahrungsbericht schriftlich",

    fullNameLabel: "Ihr Name",
    fullNamePlaceholder: "z.B. Max Mustermann",
    emailLabel: "E-Mail-Adresse",
    emailPlaceholder: "max@firma.de",
    companyLabel: "Unternehmen",
    companyPlaceholder: "Acme GmbH",
    jobTitleLabel: "Position / Rolle",
    jobTitlePlaceholder: "z.B. Produktleiter",
    websiteLabel: "Website",
    websitePlaceholder: "https://firma.de",
    ratingLabel: "Ihre Bewertung",
    feedbackLabel: "Ihr Feedback",
    feedbackPlaceholder: "Welche Herausforderungen wurden gelöst? Was schätzen Sie am meisten?",

    consentHeading: "Einwilligung zur Veröffentlichung",
    consentCheckboxDefault: "Ich gestatte die Nutzung meiner Bewertung und meines Namens zu Marketingzwecken.",
    consentNotice: "Wir respektieren Ihren Datenschutz und veröffentlichen Ihr Feedback nur mit ausdrücklicher Genehmigung.",

    recordVideoPrompt: "Mit Kamera aufnehmen",
    uploadVideoPrompt: "Videodatei hochladen",
    recordAudioPrompt: "Sprachaufnahme starten",
    uploadAudioPrompt: "Audiodatei hochladen",
    retakeMedia: "Neu aufnehmen",
    confirmMedia: "Aufnahme verwenden",

    thankYouHeading: "Vielen Dank für Ihre Bewertung!",
    thankYouDefaultMessage: "Wir schätzen Ihre Zeit und Ihre Unterstützung sehr.",
    closeWindow: "Fertig",

    pausedTitle: "Einreichungen pausiert",
    pausedMessage: "Dieses Formular nimmt derzeit keine neuen Rückmeldungen an.",
    unpublishedTitle: "Formular nicht veröffentlicht",
    unpublishedMessage: "Dieses Formular wurde vom Administrator noch nicht freigeschaltet.",
    notFoundTitle: "Formular nicht gefunden",
    notFoundMessage: "Das angeforderte Formular existiert nicht oder der Link ist veraltet.",
    returnHome: "Zur Startseite",

    requiredError: "Bitte füllen Sie alle erforderlichen Felder aus.",
    invalidEmailError: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    consentRequiredError: "Bitte bestätigen Sie die Veröffentlichungseinwilligung.",
  },

  pt: {
    stepIndicator: "Passo {current} de {total}",
    nextStep: "Continuar",
    previousStep: "Voltar",
    submitButton: "Enviar Depoimento",
    submittingButton: "Enviando...",
    chooseLanguage: "Idioma",
    requiredBadge: "Obrigatório",
    optionalBadge: "Opcional",

    chooseFormat: "Escolha como prefere compartilhar sua experiência",
    videoOption: "Gravar Vídeo",
    videoOptionDesc: "Compartilhe um depoimento curto em vídeo",
    audioOption: "Gravar Áudio",
    audioOptionDesc: "Grave suas opiniões pelo microfone",
    textOption: "Escrever Texto",
    textOptionDesc: "Digite sua avaliação e feedback por escrito",

    fullNameLabel: "Seu Nome",
    fullNamePlaceholder: "ex. Carlos Silva",
    emailLabel: "E-mail",
    emailPlaceholder: "carlos@empresa.com.br",
    companyLabel: "Nome da Empresa",
    companyPlaceholder: "Acme Brasil Ltda",
    jobTitleLabel: "Cargo / Função",
    jobTitlePlaceholder: "ex. Gerente de Produto",
    websiteLabel: "Site da Empresa",
    websitePlaceholder: "https://empresa.com.br",
    ratingLabel: "Sua Avaliação",
    feedbackLabel: "Seu Depoimento",
    feedbackPlaceholder: "Quais desafios foram solucionados? O que você mais gosta?",

    consentHeading: "Consentimento de Publicação",
    consentCheckboxDefault: "Autorizo o uso do meu depoimento e nome para fins de divulgação e marketing.",
    consentNotice: "Respeitamos sua privacidade e apenas compartilhamos seu feedback com sua autorização expressa.",

    recordVideoPrompt: "Gravar com a Câmera",
    uploadVideoPrompt: "Enviar Arquivo de Vídeo",
    recordAudioPrompt: "Gravar Áudio",
    uploadAudioPrompt: "Enviar Arquivo de Áudio",
    retakeMedia: "Regravar",
    confirmMedia: "Usar esta gravação",

    thankYouHeading: "Muito obrigado pelo seu depoimento!",
    thankYouDefaultMessage: "Agradecemos imensamente seu tempo e parceria.",
    closeWindow: "Concluir",

    pausedTitle: "Envios Pausados",
    pausedMessage: "Este formulário não está recebendo novas respostas no momento.",
    unpublishedTitle: "Formulário Não Publicado",
    unpublishedMessage: "Este formulário está temporariamente desativado pelo administrador.",
    notFoundTitle: "Formulário Não Encontrado",
    notFoundMessage: "O formulário solicitado não existe ou o link expirou.",
    returnHome: "Voltar para a Página Inicial",

    requiredError: "Por favor, preencha todos os campos obrigatórios.",
    invalidEmailError: "Por favor, insira um endereço de e-mail válido.",
    consentRequiredError: "Por favor, aceite o consentimento de publicação para prosseguir.",
  },

  ja: {
    stepIndicator: "ステップ {current} / {total}",
    nextStep: "次へ進む",
    previousStep: "戻る",
    submitButton: "フィードバックを送信",
    submittingButton: "送信中...",
    chooseLanguage: "言語を選択",
    requiredBadge: "必須",
    optionalBadge: "任意",

    chooseFormat: "フィードバックの共有方法を選択してください",
    videoOption: "動画を録画",
    videoOptionDesc: "短いビデオメッセージで声を届ける",
    audioOption: "音声で録音",
    audioOptionDesc: "マイクを使って手軽に音声を記録する",
    textOption: "テキストで記入",
    textOptionDesc: "文章で感想や評価を記入する",

    fullNameLabel: "お名前",
    fullNamePlaceholder: "例: 山田 太郎",
    emailLabel: "メールアドレス",
    emailPlaceholder: "yamada@company.jp",
    companyLabel: "会社名",
    companyPlaceholder: "株式会社アクメ",
    jobTitleLabel: "役職・部署",
    jobTitlePlaceholder: "例: プロダクトマネージャー",
    websiteLabel: "会社ホームページ",
    websitePlaceholder: "https://company.jp",
    ratingLabel: "総合評価",
    feedbackLabel: "フィードバック内容",
    feedbackPlaceholder: "どのような課題が解決されましたか？特に気に入っている点をお聞かせください。",

    consentHeading: "公開に関する同意",
    consentCheckboxDefault: "提出した感想、氏名、会社名をマーケティング目的で公開することに同意します。",
    consentNotice: "お客様のプライバシーを尊重し、明示的な同意なしに第三者に公開することはありません。",

    recordVideoPrompt: "カメラで録画",
    uploadVideoPrompt: "動画ファイルをアップロード",
    recordAudioPrompt: "音声録音を開始",
    uploadAudioPrompt: "音声ファイルをアップロード",
    retakeMedia: "再撮影・再録音",
    confirmMedia: "この録音・録画を使用",

    thankYouHeading: "貴重なご意見をありがとうございました！",
    thankYouDefaultMessage: "お時間を割いてご協力いただき、心より感謝申し上げます。",
    closeWindow: "完了",

    pausedTitle: "受付一時停止中",
    pausedMessage: "現在、新しいフィードバックの受付を一時停止しております。",
    unpublishedTitle: "フォーム非公開",
    unpublishedMessage: "このフォームは現在管理者により非公開に設定されています。",
    notFoundTitle: "フォームが見つかりません",
    notFoundMessage: "指定されたフォームが存在しないか、リンクが変更された可能性があります。",
    returnHome: "トップページへ戻る",

    requiredError: "すべての必須項目を入力してください。",
    invalidEmailError: "有効なメールアドレスを入力してください。",
    consentRequiredError: "送信するには公開への同意が必要です。",
  },

  ar: {
    stepIndicator: "الخطوة {current} من {total}",
    nextStep: "المتابعة",
    previousStep: "السابق",
    submitButton: "إرسال التقييم",
    submittingButton: "جارٍ الإرسال...",
    chooseLanguage: "اللغة",
    requiredBadge: "مطلوب",
    optionalBadge: "اختياري",

    chooseFormat: "اختر الطريقة التي تفضلها لمشاركة رأيك",
    videoOption: "تسجيل فيديو",
    videoOptionDesc: "شارك شهادة فيديو قصيرة ومباشرة",
    audioOption: "تسجيل صوتي",
    audioOptionDesc: "تحدث بحرية عبر الميكروفون",
    textOption: "كتابة نص",
    textOptionDesc: "اكتب تقييمك وملاحظاتك بالتفصيل",

    fullNameLabel: "الاسم الكامل",
    fullNamePlaceholder: "مثال: أحمد محمد",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "ahmed@company.com",
    companyLabel: "اسم الشركة",
    companyPlaceholder: "شركة النور",
    jobTitleLabel: "المسمى الوظيفي",
    jobTitlePlaceholder: "مثال: مدير المنتج",
    websiteLabel: "الموقع الإلكتروني",
    websitePlaceholder: "https://company.com",
    ratingLabel: "تقييمك العام",
    feedbackLabel: "ملاحظاتك وتقييمك",
    feedbackPlaceholder: "ما المشاكل التي تم حلها؟ ما أكثر ما أعجبك؟",

    consentHeading: "الموافقة على النشر",
    consentCheckboxDefault: "أوافق على استخدام تقييمي واسمي لأغراض التسويق والنشر العام.",
    consentNotice: "نحترم خصوصيتك التامة ولن نقوم بنشر تقييمك إلا بموافقتك الصريحة.",

    recordVideoPrompt: "التسجيل بالكاميرا",
    uploadVideoPrompt: "رفع ملف فيديو",
    recordAudioPrompt: "تسجيل صوت",
    uploadAudioPrompt: "رفع ملف صوتي",
    retakeMedia: "إعادة التسجيل",
    confirmMedia: "اعتماد هذا التسجيل",

    thankYouHeading: "شكراً جزيلاً لمشاركتك رأيك!",
    thankYouDefaultMessage: "نقدر وقتك ودعمك المستمر لنا.",
    closeWindow: "إنهاء",

    pausedTitle: "الاستقبال متوقف مؤقتاً",
    pausedMessage: "هذا النموذج متوقف عن استقبال الردود حالياً. يرجى المحاولة لاحقاً.",
    unpublishedTitle: "النموذج غير منشور",
    unpublishedMessage: "هذا النموذج غير منشور حالياً بواسطة المسؤول.",
    notFoundTitle: "النموذج غير موجود",
    notFoundMessage: "النموذج المطلوب غير متوفر أو ربما تم تغيير الرابط.",
    returnHome: "العودة للرئيسية",

    requiredError: "يرجى ملء جميع الحقول المطلوبة.",
    invalidEmailError: "يرجى إدخال عنوان بريد إلكتروني صحيح.",
    consentRequiredError: "يرجى الموافقة على شروط النشر للمتابعة.",
  },
};

export function getDictionary(languageCode: string = "en"): FormDictionary {
  const normalized = languageCode.toLowerCase().split("-")[0].trim();
  const dict = DICTIONARIES[normalized];
  if (dict) return dict;
  return DICTIONARIES.en;
}
