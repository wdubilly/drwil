// Messages de `drwil serve`, dans la langue du projet. Aucun ne reçoit jamais le jeton (QUA-270).
export const SERVE_TEXTS = {
  fr: {
    listening: "drwil serve : {0} (lecture seule, Ctrl+C pour arrêter)",
    started: "drwil serve : démarré en arrière-plan : {0}",
    already: "drwil serve : déjà démarré pour ce projet : {0}",
    starting: "drwil serve : un démarrage est déjà en cours pour ce projet.",
    notProject: "drwil serve : projet non initialisé (.drwil/ia-first.json introuvable) : lancer « drwil init » d'abord.",
    badPort: "--port {0} : attendu un entier de 0 à 65535.",
    portBusy: "drwil serve : le port {0} est déjà occupé.",
    tokenRequired:
      "--host {0} : hors de 127.0.0.1, un jeton est obligatoire. Dans votre propre terminal, définir la variable d'environnement DRWIL_SERVE_TOKEN (au moins {1} caractères), puis relancer. Ne jamais la coller dans le chat.",
    tokenWeak: "DRWIL_SERVE_TOKEN est trop court : au moins {0} caractères.",
    startFailed: "drwil serve : le serveur n'a pas démarré. Journal : {0}",
  },
  en: {
    listening: "drwil serve: {0} (read-only, Ctrl+C to stop)",
    started: "drwil serve: started in the background: {0}",
    already: "drwil serve: already running for this project: {0}",
    starting: "drwil serve: a start is already in progress for this project.",
    notProject: 'drwil serve: project not initialised (.drwil/ia-first.json not found): run "drwil init" first.',
    badPort: "--port {0}: expected an integer from 0 to 65535.",
    portBusy: "drwil serve: port {0} is already in use.",
    tokenRequired:
      "--host {0}: outside 127.0.0.1 a token is mandatory. In your own terminal, set the DRWIL_SERVE_TOKEN environment variable (at least {1} characters), then start again. Never paste it in the chat.",
    tokenWeak: "DRWIL_SERVE_TOKEN is too short: at least {0} characters.",
    startFailed: "drwil serve: the server did not start. Log: {0}",
  },
} as const;

export type ServeMessage = keyof (typeof SERVE_TEXTS)["fr"];
