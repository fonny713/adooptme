import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

type FormState = {
  name: string;
  age: string;
  species: string;
  shelter: string;
  city: string;
};

type StatusState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  age: "",
  species: "",
  shelter: "",
  city: "",
};

const BEHAVIOR_OPTIONS = [
  "Wesoły",
  "Aktywny",
  "Spokojny",
  "Leniuch",
  "Mało szczeka",
  "Lubi spacery",
  "Lękliwy",
  "Towarzyski",
];

const PERSONALITY_OPTIONS = [
  "Czuły",
  "Łagodny",
  "Niezależny",
  "Ciekawski",
  "Uparty",
  "Otwarty",
  "Ostrożny",
  "Zabawowy",
];

const createPetId = () => `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function Panel() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<StatusState>({ tone: "idle", message: "" });
  const [behaviorTags, setBehaviorTags] = useState<string[]>([]);
  const [behaviorCustom, setBehaviorCustom] = useState("");
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [personalityCustom, setPersonalityCustom] = useState("");

  const buildPayload = (id: string, photoUrls: string[]) => ({
    id,
    name: form.name.trim(),
    age: form.age.trim(),
    species: form.species.trim(),
    shelter: form.shelter.trim(),
    city: form.city.trim(),
    behavior: behaviorTags.join(", "),
    personality: personalityTags.join(", "),
    photos: photoUrls,
  });

  const normalizeTag = (value: string) => value.trim();

  const tagExists = (tags: string[], value: string) =>
    tags.some((tag) => tag.toLowerCase() === value.toLowerCase());

  const addTag = (value: string, setTags: (next: string[]) => void, tags: string[]) => {
    const trimmed = normalizeTag(value);
    if (!trimmed || tagExists(tags, trimmed)) {
      return;
    }

    setTags([...tags, trimmed]);
  };

  const toggleTag = (value: string, tags: string[], setTags: (next: string[]) => void) => {
    if (tagExists(tags, value)) {
      setTags(tags.filter((tag) => tag.toLowerCase() !== value.toLowerCase()));
      return;
    }

    addTag(value, setTags, tags);
  };

  const removeTag = (value: string, tags: string[], setTags: (next: string[]) => void) => {
    setTags(tags.filter((tag) => tag.toLowerCase() !== value.toLowerCase()));
  };

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickPhotos = async () => {
    setStatus({ tone: "idle", message: "" });

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setStatus({
        tone: "error",
        message: "Potrzebujemy dostępu do biblioteki zdjęć.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 0,
    });

    if (result.canceled) {
      return;
    }

    setPhotos((prev) => [...prev, ...result.assets]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setStatus({ tone: "idle", message: "" });

    const requiredMissing: string[] = [];
    if (!form.name.trim()) requiredMissing.push("Imię");
    if (!form.age.trim()) requiredMissing.push("Wiek");
    if (!form.species.trim()) requiredMissing.push("Gatunek");
    if (!form.shelter.trim()) requiredMissing.push("Schronisko");
    if (!form.city.trim()) requiredMissing.push("Miasto");

    if (requiredMissing.length > 0) {
      setStatus({
        tone: "error",
        message: `Uzupełnij pola: ${requiredMissing.join(", ")}.`,
      });
      return;
    }

    if (photos.length === 0) {
      setStatus({ tone: "error", message: "Dodaj przynajmniej jedno zdjęcie." });
      return;
    }

    if (!supabase) {
      setStatus({
        tone: "error",
        message: "Brak konfiguracji Supabase. Sprawdź plik .env.",
      });
      return;
    }

    try {
      setIsSending(true);
      const petId = createPetId();
      const uploadedUrls: string[] = [];

      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        const fileName = photo.fileName ?? `photo-${index + 1}.jpg`;
        const extension = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
        const path = `${petId}/${Date.now()}-${index}.${extension}`;
        const contentType = photo.mimeType ?? "image/jpeg";

        let fileBody: Blob | File;
        if (photo.file) {
          fileBody = photo.file;
        } else {
          const response = await fetch(photo.uri);
          fileBody = await response.blob();
        }

        const { error: uploadError } = await supabase.storage
          .from("pet-photos")
          .upload(path, fileBody, { contentType, upsert: false });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      const payload = buildPayload(petId, uploadedUrls);
      const { error: insertError } = await supabase.from("pets").insert(payload);

      if (insertError) {
        throw insertError;
      }

      setStatus({ tone: "success", message: "Zwierzę dodane do bazy Supabase." });
      setForm(EMPTY_FORM);
      setPhotos([]);
      setBehaviorTags([]);
      setBehaviorCustom("");
      setPersonalityTags([]);
      setPersonalityCustom("");
    } catch {
      setStatus({
        tone: "error",
        message: "Nie udało się zapisać. Sprawdź połączenie i ustawienia Supabase.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const statusStyle =
    status.tone === "error"
      ? styles.statusError
      : status.tone === "success"
      ? styles.statusSuccess
      : null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.background} pointerEvents="none">
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.title}>Panel schroniska</Text>
              <Text style={styles.subtitle}>
                Dodaj nowe zwierzę do adopcji. Pola oznaczone * są wymagane.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Imię *</Text>
              <TextInput
                style={styles.input}
                placeholder="np. Mela"
                value={form.name}
                onChangeText={(value) => updateField("name", value)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Wiek *</Text>
              <TextInput
                style={styles.input}
                placeholder="np. 2 lata"
                value={form.age}
                onChangeText={(value) => updateField("age", value)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Gatunek *</Text>
              <TextInput
                style={styles.input}
                placeholder="np. pies, kot"
                value={form.species}
                onChangeText={(value) => updateField("species", value)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Schronisko *</Text>
              <TextInput
                style={styles.input}
                placeholder="np. Schronisko Miejskie w Krakowie"
                value={form.shelter}
                onChangeText={(value) => updateField("shelter", value)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Miasto *</Text>
              <TextInput
                style={styles.input}
                placeholder="np. Kraków"
                value={form.city}
                onChangeText={(value) => updateField("city", value)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Zachowanie</Text>
              <View style={styles.tagGrid}>
                {BEHAVIOR_OPTIONS.map((option) => {
                  const isSelected = tagExists(behaviorTags, option);
                  return (
                    <Pressable
                      key={option}
                      style={({ pressed }) => [
                        styles.tagChip,
                        isSelected && styles.tagChipSelected,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => toggleTag(option, behaviorTags, setBehaviorTags)}
                    >
                      <Text
                        style={[styles.tagText, isSelected && styles.tagTextSelected]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.input, styles.tagInput]}
                  placeholder="Dodaj własne zachowanie"
                  value={behaviorCustom}
                  onChangeText={setBehaviorCustom}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.tagAddButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    addTag(behaviorCustom, setBehaviorTags, behaviorTags);
                    setBehaviorCustom("");
                  }}
                >
                  <Text style={styles.tagAddButtonText}>Dodaj</Text>
                </Pressable>
              </View>
              {behaviorTags.length > 0 ? (
                <View style={styles.tagSelectedRow}>
                  {behaviorTags.map((tag) => (
                    <Pressable
                      key={`behavior-${tag}`}
                      style={({ pressed }) => [
                        styles.tagSelectedChip,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => removeTag(tag, behaviorTags, setBehaviorTags)}
                    >
                      <Text style={styles.tagSelectedText}>{tag}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Osobowość</Text>
              <View style={styles.tagGrid}>
                {PERSONALITY_OPTIONS.map((option) => {
                  const isSelected = tagExists(personalityTags, option);
                  return (
                    <Pressable
                      key={option}
                      style={({ pressed }) => [
                        styles.tagChip,
                        isSelected && styles.tagChipSelected,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => toggleTag(option, personalityTags, setPersonalityTags)}
                    >
                      <Text
                        style={[styles.tagText, isSelected && styles.tagTextSelected]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.input, styles.tagInput]}
                  placeholder="Dodaj własną cechę"
                  value={personalityCustom}
                  onChangeText={setPersonalityCustom}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.tagAddButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    addTag(personalityCustom, setPersonalityTags, personalityTags);
                    setPersonalityCustom("");
                  }}
                >
                  <Text style={styles.tagAddButtonText}>Dodaj</Text>
                </Pressable>
              </View>
              {personalityTags.length > 0 ? (
                <View style={styles.tagSelectedRow}>
                  {personalityTags.map((tag) => (
                    <Pressable
                      key={`personality-${tag}`}
                      style={({ pressed }) => [
                        styles.tagSelectedChip,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => removeTag(tag, personalityTags, setPersonalityTags)}
                    >
                      <Text style={styles.tagSelectedText}>{tag}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Zdjęcia *</Text>
              {photos.length === 0 ? (
                <Text style={styles.photoEmpty}>Brak dodanych zdjęć.</Text>
              ) : (
                <View style={styles.photoList}>
                  {photos.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`} style={styles.photoRow}>
                      <Text style={styles.photoName} numberOfLines={1}>
                        {photo.fileName ?? photo.uri.split("/").pop() ?? `Zdjęcie ${index + 1}`}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.photoRemove,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => removePhoto(index)}
                      >
                        <Text style={styles.photoRemoveText}>Usuń</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={pickPhotos}
              >
                <Text style={styles.secondaryButtonText}>
                  {photos.length > 0 ? "Dodaj kolejne zdjęcia" : "Wybierz zdjęcia"}
                </Text>
              </Pressable>
              <Text style={styles.photoHint}>Możesz zaznaczyć wiele plików naraz.</Text>
            </View>

            {status.message ? (
              <View style={[styles.status, statusStyle]}>
                <Text style={styles.statusText}>{status.message}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                isSending && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSending}
            >
              <Text style={styles.primaryButtonText}>
                {isSending ? "Wysyłanie..." : "Wyślij do bazy"}
              </Text>
            </Pressable>

            <Text style={styles.helperText}>
              Dane trafią do bazy Supabase po wysłaniu formularza.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: "#f7f3ee",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  blobTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: "#efe3d6",
    top: -110,
    right: -90,
  },
  blobBottom: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: "#e4f0ea",
    bottom: -150,
    left: -140,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
  },
  panel: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  panelHeader: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.4,
    fontFamily: "Georgia",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#475569",
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  textarea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tagChipSelected: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  tagText: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "600",
  },
  tagTextSelected: {
    color: "#ffffff",
  },
  tagInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  tagInput: {
    flex: 1,
  },
  tagAddButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#0f766e",
  },
  tagAddButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  tagSelectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tagSelectedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ecfeff",
  },
  tagSelectedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  photoList: {
    marginBottom: 10,
  },
  photoName: {
    flex: 1,
    fontSize: 12,
    color: "#0f172a",
  },
  photoEmpty: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 10,
  },
  photoHint: {
    marginTop: 8,
    fontSize: 11,
    color: "#94a3b8",
  },
  photoRemove: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  photoRemoveText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f8f9ff",
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2b3a75",
    letterSpacing: 0.4,
  },
  status: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  statusSuccess: {
    backgroundColor: "#e6f4ef",
  },
  statusError: {
    backgroundColor: "#fdecec",
  },
  statusText: {
    fontSize: 12,
    color: "#0f172a",
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
