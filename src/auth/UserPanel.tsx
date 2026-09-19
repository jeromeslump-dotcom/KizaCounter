import { type ReactNode } from "react";

interface UserPanelProps {
  open: boolean;
  onClose: () => void;
  onManageHeroes: () => void;
  onThemeChange: (theme: "agi" | "str" | "int") => void;
  theme: "agi" | "str" | "int";
  onOpenAdminPanel?: () => void;
  isAdmin?: boolean;
  userName: string;
  onSignOut: () => void;
  submitting?: boolean;
}

interface UserActionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
}

function UserAction({ icon, title, description, onClick }: UserActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-card is-active w-full rounded-xl p-4 text-left transition hover:scale-[1.01]"
    >
      <span className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ui-divider text-lg"
          aria-hidden="true"
        >
          {icon}
        </span>

        <span className="min-w-0">
          <span className="ui-text-primary block text-sm font-black">
            {title}
          </span>

          {description && (
            <span className="ui-text-secondary mt-1 block text-xs leading-relaxed">
              {description}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function UserPanel({
  open,
  onClose,
  onManageHeroes,
  onThemeChange,
  theme,
  onOpenAdminPanel,
  isAdmin = false,
  userName,
  onSignOut,
  submitting = false,
}: UserPanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b ui-divider p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="user-panel-title"
                className="ui-text-primary text-xl font-black"
              >
                👤 {userName}
              </h2>

              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Paramètres du compte
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ui-button-icon"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <UserAction
            icon="⚙️"
            title="Gérer les héros"
            description="Gérer les héros disponibles dans l'application"
            onClick={onManageHeroes}
          />

          <div className="ui-card is-active rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ui-divider text-lg"
                aria-hidden="true"
              >
                🎨
              </span>

              <div className="min-w-0 flex-1">
                <div className="ui-text-primary text-sm font-black">
                  Choix du thème
                </div>

                <div className="ui-text-secondary mt-1 text-xs leading-relaxed">
                  Choisir le thème visuel de l'application
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onThemeChange("agi")}
                    className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
                      theme === "agi"
                        ? "bg-white/5"
                        : "ui-divider ui-text-secondary"
                    }`}
                    style={
                      theme === "agi"
                        ? { borderColor: "var(--ui-theme)" }
                        : undefined
                    }
                  >
                    <img
                      src="/temp-colors/AGI.webp"
                      alt="AGI"
                      className="mx-auto h-6 w-6 object-contain"
                    />
                    <span className="mt-1 block">AGI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChange("str")}
                    className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
                      theme === "str"
                        ? "bg-white/5"
                        : "ui-divider ui-text-secondary"
                    }`}
                    style={
                      theme === "str"
                        ? { borderColor: "var(--ui-theme)" }
                        : undefined
                    }
                  >
                    <img
                      src="/temp-colors/STR.webp"
                      alt="STR"
                      className="mx-auto h-6 w-6 object-contain"
                    />
                    <span className="mt-1 block">STR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChange("int")}
                    className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
                      theme === "int"
                        ? "bg-white/5"
                        : "ui-divider ui-text-secondary"
                    }`}
                    style={
                      theme === "int"
                        ? { borderColor: "var(--ui-theme)" }
                        : undefined
                    }
                  >
                    <img
                      src="/temp-colors/INT.webp"
                      alt="INT"
                      className="mx-auto h-6 w-6 object-contain"
                    />
                    <span className="mt-1 block">INT</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isAdmin && onOpenAdminPanel && (
            <UserAction
              icon="⚙️"
              title="Admin Panel"
              description="Gestion de l'application"
              onClick={onOpenAdminPanel}
            />
          )}

          <UserAction
            icon="🚪"
            title={submitting ? "Déconnexion..." : "Déconnexion"}
            description="Se déconnecter de l'application"
            onClick={onSignOut}
          />
        </div>

        <footer className="flex justify-end border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={onClose} className="ui-button">
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
