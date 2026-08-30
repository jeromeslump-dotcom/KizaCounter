import { useEffect, useMemo, useState } from "react";
import { supabase } from "../storage/supabase";

export type UserRole = "user" | "contributor" | "admin";

interface UserProfile {
  id: string;
  display_name: string;
  role: UserRole;
  active: boolean;
}

interface UserManagementProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: "Utilisateur",
  contributor: "Contributeur",
  admin: "Administrateur",
};

const ROLE_OPTIONS: UserRole[] = ["user", "contributor", "admin"];

export default function UserManagement({
  open,
  onClose,
  onBack,
}: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function loadUsers() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("id, display_name, role, active")
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (loadError) {
        setError("Impossible de charger les utilisateurs.");
        setLoading(false);
        return;
      }

      const profiles = (data ?? []) as UserProfile[];
      setUsers(profiles);
      setDraftRoles(
        Object.fromEntries(profiles.map((user) => [user.id, user.role]))
      );
      setLoading(false);
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [open]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;

    return users.filter((user) =>
      user.display_name.toLowerCase().includes(normalized)
    );
  }, [query, users]);

  async function saveRole(user: UserProfile) {
    const role = draftRoles[user.id];
    if (!role || role === user.role) return;

    setSavingId(user.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    if (updateError) {
      setError("Impossible d'enregistrer ce rôle.");
      setSavingId(null);
      return;
    }

    setUsers((current) =>
      current.map((item) => (item.id === user.id ? { ...item, role } : item))
    );
    setSavingId(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
      <div className="ui-modal user-management-modal flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b ui-divider p-4 sm:p-6">
          <div>
            <h2 className="ui-text-primary text-xl font-black">
              Gestion des utilisateurs
            </h2>
            <p className="ui-text-secondary mt-1 text-sm">
              Gestion des rôles utilisateurs
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ui-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="hero-grid-input user-management-search mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          />

          {error && (
            <p className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {loading ? (
            <p className="ui-text-soft py-10 text-center text-sm">
              Chargement...
            </p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const selectedRole = draftRoles[user.id] ?? user.role;
                const changed = selectedRole !== user.role;

                return (
                  <div
                    key={user.id}
                    className={`user-management-card rounded-2xl border p-4 ${
                      user.active ? "is-active" : "is-inactive"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="ui-text-primary font-bold">
                          {user.display_name}
                        </div>
                        <div className="ui-text-secondary mt-1 text-xs">
                          Rôle actuel : {ROLE_LABELS[user.role] ?? user.role}
                        </div>
                      </div>

                      <span
                        className={`user-management-status shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                          user.active ? "is-active" : "is-inactive"
                        }`}
                      >
                        {user.active ? "Actif" : "Inactif"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={selectedRole}
                        onChange={(event) =>
                          setDraftRoles((current) => ({
                            ...current,
                            [user.id]: event.target.value as UserRole,
                          }))
                        }
                        className="ui-input user-management-role min-w-[180px] rounded-lg border px-3 py-2 text-xs font-bold outline-none"
                        aria-label={`Rôle de ${user.display_name}`}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!changed || savingId === user.id}
                        onClick={() => saveRole(user)}
                        className="ui-action user-management-save ml-auto rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {savingId === user.id
                          ? "Enregistrement..."
                          : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {!filteredUsers.length && (
                <p className="ui-text-soft py-10 text-center text-sm">
                  Aucun utilisateur trouvé.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t ui-divider px-4 py-3 sm:px-6 sm:py-4">
          <span className="ui-text-soft text-xs">
            {users.length} utilisateurs
          </span>

          <button
            type="button"
            onClick={onBack}
            className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            Retour au Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}
