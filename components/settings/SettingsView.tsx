"use client";

import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { ProfileFields } from "@/components/shared/ProfileFields";
import { ReferenceFields } from "@/components/shared/ReferenceFields";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingPanel } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/fields";
import { useToast } from "@/components/ui/Toast";
import { useAppState } from "@/lib/storage/useAppState";
import {
  validateProfileDraft,
  type ProfileDraft,
  type ProfileErrors,
} from "@/lib/validation";
import {
  localDateString,
  profileToDraft,
  referenceToDraft,
  validateReferenceDraft,
  type ReferenceDraft,
  type ReferenceErrors,
} from "@/lib/validation/drafts";
import type { PaceUnit } from "@/lib/format";

function ProfileSection() {
  const { state, update } = useAppState();
  const toast = useToast();
  const [draft, setDraft] = useState<ProfileDraft>(() => profileToDraft(state.profile));
  const [errors, setErrors] = useState<ProfileErrors>({});

  function save(): void {
    const validation = validateProfileDraft(draft);
    setErrors(validation.errors);
    const profile = validation.profile;
    if (profile === null) {
      toast("Profil belum valid. Cek pesan di bawah field.", "error");
      return;
    }
    const saved = update((current) => ({ ...current, profile }));
    if (saved) toast("Profil tersimpan di browser ini.");
    else toast("Gagal menyimpan ke browser. Cek pengaturan penyimpanan.", "error");
  }

  return (
    <Panel title="Profil heart rate" description="Dipakai untuk HRmax, zona HR, dan target HR di seluruh aplikasi.">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="grid gap-5"
      >
        <ProfileFields
          idPrefix="settings-hr"
          draft={draft}
          errors={errors}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        />
        <Button type="submit" variant="primary" icon={<Save size={18} aria-hidden="true" />} className="sm:self-start">
          Simpan profil
        </Button>
      </form>
    </Panel>
  );
}

function ReferenceSection() {
  const { state, update } = useAppState();
  const toast = useToast();
  const [draft, setDraft] = useState<ReferenceDraft>(() => referenceToDraft(state.reference));
  const [errors, setErrors] = useState<ReferenceErrors>({});

  function save(): void {
    const validation = validateReferenceDraft(draft, localDateString(new Date()), false);
    setErrors(validation.errors);
    const reference = validation.reference;
    if (reference === null) {
      toast("Data referensi belum valid. Cek pesan di bawah field.", "error");
      return;
    }
    const saved = update((current) => ({ ...current, reference }));
    if (saved) toast("Data referensi tersimpan di browser ini.");
    else toast("Gagal menyimpan ke browser. Cek pengaturan penyimpanan.", "error");
  }

  return (
    <Panel title="Data referensi" description="Hasil tes atau race terbaru. Kosongkan waktu untuk menghapus referensi.">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="grid gap-5"
      >
        <ReferenceFields
          idPrefix="settings-ref"
          draft={draft}
          errors={errors}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          showDate
          timeOptional
        />
        <Button type="submit" variant="primary" icon={<Save size={18} aria-hidden="true" />} className="sm:self-start">
          Simpan referensi
        </Button>
      </form>
    </Panel>
  );
}

function SettingsWorkspace() {
  const { state, update, reset } = useAppState();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [version, setVersion] = useState(0);

  function setUnit(paceUnit: PaceUnit): void {
    update((current) => ({ ...current, preferences: { ...current.preferences, paceUnit } }));
  }

  function handleReset(): void {
    const cleared = reset();
    setConfirmOpen(false);
    setVersion((current) => current + 1);
    if (cleared) toast("Semua data lokal dihapus.");
    else toast("Data di layar direset, tapi browser menolak menghapus penyimpanan.", "error");
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <ProfileSection key={`profile-${version}`} />
      <ReferenceSection key={`reference-${version}`} />

      <Panel title="Satuan pace" description="Hanya mengubah tampilan. Perhitungan internal tetap per kilometer.">
        <SegmentedControl
          label="Satuan pace"
          value={state.preferences.paceUnit}
          options={[
            { value: "km", label: "Menit per km" },
            { value: "mi", label: "Menit per mil" },
          ]}
          onChange={setUnit}
          hint="Jarak lomba dan tabel split tetap dalam kilometer."
        />
      </Panel>

      <Panel title="Data lokal">
        <div className="grid gap-4">
          <Notice>
            Semua data disimpan di browser ini lewat localStorage. Tidak ada yang dikirim ke server. Membersihkan data
            situs di browser juga akan menghapusnya.
          </Notice>
          <Button
            variant="danger"
            icon={<Trash2 size={18} aria-hidden="true" />}
            onClick={() => setConfirmOpen(true)}
            className="sm:self-start"
          >
            Reset data lokal
          </Button>
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus semua data lokal?"
        description="Profil, hasil tes, target lomba, dan pengaturan split akan dihapus dari browser ini. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, hapus semua"
        onConfirm={handleReset}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export function SettingsView() {
  const { ready } = useAppState();
  return (
    <>
      <PageHeader title="Settings" description="Profil, data referensi, satuan, dan pengelolaan data lokal." />
      {ready ? <SettingsWorkspace /> : <LoadingPanel />}
    </>
  );
}
