import { Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { supabase } from "../lib/supabase";

type PetCard = {
  id: string;
  name: string;
  age: string;
  species: string;
  shelter: string;
  city: string;
  photos: string[];
  behavior: string;
  personality: string;
};

export default function Index() {
  const { width, height } = useWindowDimensions();
  const [pets, setPets] = useState<PetCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const swipe = useRef(new Animated.ValueXY()).current;
  const swipeThreshold = Math.max(120, width * 0.25);

  const likeOpacity = swipe.x.interpolate({
    inputRange: [20, swipeThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = swipe.x.interpolate({
    inputRange: [-swipeThreshold, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const rotate = swipe.x.interpolate({
    inputRange: [-swipeThreshold, 0, swipeThreshold],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const cardWidth = Math.min(width * 0.9, 420);
  const cardHeight = Math.min(height * 0.62, 520);

  const hasPets = pets.length > 0;
  const currentPet = hasPets ? pets[cardIndex % pets.length] : null;

  useEffect(() => {
    let isActive = true;

    const loadPets = async () => {
      if (!supabase) {
        if (isActive) {
          setLoadError("Brak konfiguracji Supabase.");
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isActive) {
        return;
      }

      if (error) {
        setLoadError("Nie udało się pobrać zwierząt.");
        setPets([]);
      } else {
        setPets((data ?? []) as PetCard[]);
        setLoadError(null);
        setCardIndex(0);
      }

      setIsLoading(false);
    };

    loadPets();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  const resetPosition = () => {
    Animated.spring(swipe, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const forceSwipe = (direction: 1 | -1) => {
    if (!pets.length) {
      return;
    }

    Animated.timing(swipe, {
      toValue: { x: direction * (width + 120), y: 0 },
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      swipe.setValue({ x: 0, y: 0 });
      setCardIndex((prev) => (prev + 1) % pets.length);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: Animated.event([null, { dx: swipe.x, dy: swipe.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, { dx }) => {
          if (dx > swipeThreshold) {
            forceSwipe(1);
          } else if (dx < -swipeThreshold) {
            forceSwipe(-1);
          } else {
            resetPosition();
          }
        },
        onPanResponderTerminate: resetPosition,
      }),
    [swipe, swipeThreshold, width, pets.length]
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.background} pointerEvents="none">
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />
      </View>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>Adooptme</Text>
            <Text style={styles.tagline}>Adopcja lokalnie, bez stresu.</Text>
          </View>
          <Link href="/panel" asChild>
            <Pressable
              style={({ pressed }) => [styles.panelButton, pressed && styles.panelButtonPressed]}
            >
              <Text style={styles.panelButtonText}>Panel schroniska</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.cardArea}>
          {currentPet ? (
            <Animated.View
              style={[
                styles.card,
                {
                  width: cardWidth,
                  height: cardHeight,
                  transform: [
                    { translateX: swipe.x },
                    { translateY: swipe.y },
                    { rotate },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <Image source={{ uri: currentPet.photos[0] }} style={styles.cardImage} />

              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardName}>{currentPet.name}</Text>
                  <View style={styles.agePill}>
                    <Text style={styles.ageText}>{currentPet.age}</Text>
                  </View>
                </View>
                <View style={styles.chipRow}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{currentPet.species}</Text>
                  </View>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{currentPet.city}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <Text style={styles.cardSub} numberOfLines={1}>
                  Schronisko: {currentPet.shelter}
                </Text>
                <View style={styles.divider} />
                <Text style={styles.cardDetail} numberOfLines={1}>
                  Zachowanie: {currentPet.behavior}
                </Text>
                <Text style={styles.cardDetail} numberOfLines={1}>
                  Osobowość: {currentPet.personality}
                </Text>
              </View>

              <Animated.View style={[styles.badge, styles.badgeLike, { opacity: likeOpacity }]}>
                <Text style={[styles.badgeText, styles.badgeTextLike]}>ADOPTUJ</Text>
              </Animated.View>
              <Animated.View style={[styles.badge, styles.badgeNope, { opacity: nopeOpacity }]}>
                <Text style={[styles.badgeText, styles.badgeTextNope]}>POMIŃ</Text>
              </Animated.View>
            </Animated.View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {isLoading
                  ? "Ładowanie..."
                  : loadError
                  ? "Brak połączenia"
                  : "Brak zwierząt"}
              </Text>
              <Text style={styles.emptyText}>
                {isLoading
                  ? "Pobieramy dane z bazy."
                  : loadError
                  ? loadError
                  : "Dodaj zwierzęta w panelu schroniska."}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>Przeglądaj, przesuwając karty.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f3ee",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  blobTop: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "#f1e6da",
    top: -90,
    right: -70,
  },
  blobBottom: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: "#f1e9e7",
    bottom: -150,
    left: -140,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1b1b1b",
    letterSpacing: 0.6,
    fontFamily: "Satoshi-Black",
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    color: "#695247",
    fontFamily: "Satoshi-Regular",
  },
  panelButton: {
    backgroundColor: "#763d0f",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  panelButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.4,
    fontFamily: "Satoshi-Medium",
  },
  panelButtonPressed: {
    opacity: 0.85,
  },
  panel: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  cardArea: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  cardImage: {
    width: "100%",
    height: "64%",
    resizeMode: "cover",
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "Satoshi-Black",
  },
  agePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  ageText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "Satoshi-Bold",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontFamily: "Satoshi-Regular",
    borderRadius: 999,
    backgroundColor: "#dbfaff93",
  },
  chipText: {
    
    fontFamily: "Satoshi-Regular",
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardSub: {
    fontSize: 14,
    color: "#4a3328",
    fontFamily: "Satoshi-Medium",
  },
  cardDetail: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    fontFamily: "Satoshi-Medium",
  },
  divider: {
    height: 1,
    backgroundColor: "#edf2f7",
  },
  badge: {
    position: "absolute",
    top: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2,
    borderRadius: 999,
  },
  badgeLike: {
    left: 16,
    borderColor: "#0f766e",
  },
  badgeNope: {
    right: 16,
    borderColor: "#e35d5d",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: "Satoshi-Bold",
  },
  badgeTextLike: {
    color: "#0f766e",
  },
  badgeTextNope: {
    color: "#e35d5d",
  },
  footer: {
    marginBottom: 16,
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Satoshi-Regular",
  },
  emptyState: {
    width: "100%",
    maxWidth: 360,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "Satoshi-Bold",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    fontFamily: "Satoshi-Regular",
  },
});
