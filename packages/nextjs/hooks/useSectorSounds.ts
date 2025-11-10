import { useCallback, useEffect, useRef } from "react";

/**
 * Sound types available in the sector
 */
export type SoundType =
  | "open"
  | "close"
  | "sonar1" // Smallest asteroid
  | "sonar2"
  | "sonar3"
  | "sonar4"
  | "sonar5" // Largest asteroid
  | "ship1" // Largest ships
  | "ship2"
  | "ship3"
  | "ship4"
  | "ship5" // Smallest ships
  | "drill1" // Mining sounds
  | "drill2"
  | "drill3"
  | "drill4"
  | "explode1" // Smallest asteroid explosion
  | "explode2" // Medium asteroid explosion
  | "explode3" // Largest asteroid explosion
  | "refuel" // Refueling at station
  | "blip" // Ship retargeting
  | "accept" // Station rebroadcast ping
  | "blast1" // Ship attack sounds
  | "blast2"
  | "whipsplat" // Ship destruction impact
  | "death1" // Ship destruction screams
  | "death2"
  | "death3"
  | "combat"
  | "exit"
  | "tip"
  | "upgrade1" // Station upgrade base1 -> base2
  | "upgrade2" // Station upgrade base2 -> base3
  | "upgrade3" // Station upgrade base3 -> base4
  | "points1" // Smallest tip sound
  | "points2"
  | "points3"
  | "points4"
  | "points5" // Largest tip sound
  | "pointsX"; // Extra large tip sound

/**
 * Hook for managing sector sound effects
 * Preloads all sounds for better performance and provides a simple playSound function
 */
export const useSectorSounds = () => {
  const soundsRef = useRef<Record<SoundType, HTMLAudioElement | null>>({
    open: null,
    close: null,
    sonar1: null,
    sonar2: null,
    sonar3: null,
    sonar4: null,
    sonar5: null,
    ship1: null,
    ship2: null,
    ship3: null,
    ship4: null,
    ship5: null,
    drill1: null,
    drill2: null,
    drill3: null,
    drill4: null,
    explode1: null,
    explode2: null,
    explode3: null,
    refuel: null,
    blip: null,
    accept: null,
    blast1: null,
    blast2: null,
    whipsplat: null,
    death1: null,
    death2: null,
    death3: null,
    combat: null,
    exit: null,
    tip: null,
    upgrade1: null,
    upgrade2: null,
    upgrade3: null,
    points1: null,
    points2: null,
    points3: null,
    points4: null,
    points5: null,
    pointsX: null,
  });

  // Single shared audio element for drill sounds that we can actually stop
  const activeDrillAudioRef = useRef<HTMLAudioElement | null>(null);

  // Single shared audio element for refuel sounds that we can actually stop
  const activeRefuelAudioRef = useRef<HTMLAudioElement | null>(null);

  // Preload sounds on mount
  useEffect(() => {
    // Load currently available sounds
    const loadSound = (type: SoundType, path: string) => {
      try {
        const audio = new Audio(path);
        audio.preload = "auto";
        soundsRef.current[type] = audio;
      } catch (error) {
        console.error(`Failed to load sound: ${type}`, error);
      }
    };

    // Load UI sounds
    loadSound("open", "/sounds/open.mp3");
    loadSound("close", "/sounds/close.mp3");

    // Load asteroid sonar sounds (by size)
    loadSound("sonar1", "/sounds/sonar1.mp3");
    loadSound("sonar2", "/sounds/sonar2.mp3");
    loadSound("sonar3", "/sounds/sonar3.mp3");
    loadSound("sonar4", "/sounds/sonar4.mp3");
    loadSound("sonar5", "/sounds/sonar5.mp3");

    // Load ship spawn sounds (by size)
    loadSound("ship1", "/sounds/ship1.mp3");
    loadSound("ship2", "/sounds/ship2.mp3");
    loadSound("ship3", "/sounds/ship3.mp3");
    loadSound("ship4", "/sounds/ship4.mp3");
    loadSound("ship5", "/sounds/ship5.mp3");

    // Load mining drill sounds
    loadSound("drill1", "/sounds/drill1.mp3");
    loadSound("drill2", "/sounds/drill2.mp3");
    loadSound("drill3", "/sounds/drill3.mp3");
    loadSound("drill4", "/sounds/drill4.mp3");

    // Load explosion sounds (by asteroid size)
    loadSound("explode1", "/sounds/explode1.mp3");
    loadSound("explode2", "/sounds/explode2.mp3");
    loadSound("explode3", "/sounds/explode3.mp3");

    // Load refuel sound
    loadSound("refuel", "/sounds/refuel.mp3");

    // Load retarget blip sound
    loadSound("blip", "/sounds/blip.mp3");

    // Load station rebroadcast sound
    loadSound("accept", "/sounds/accept.mp3");

    // Load combat sounds
    loadSound("blast1", "/sounds/blast1.mp3");
    loadSound("blast2", "/sounds/blast2.mp3");
    loadSound("whipsplat", "/sounds/whipsplat.mp3");
    loadSound("death1", "/sounds/death1.mp3");
    loadSound("death2", "/sounds/death2.mp3");
    loadSound("death3", "/sounds/death3.mp3");

    // Load station upgrade sounds
    loadSound("upgrade1", "/sounds/upgrade1.mp3"); // base1 -> base2
    loadSound("upgrade2", "/sounds/upgrade2.mp3"); // base2 -> base3
    loadSound("upgrade3", "/sounds/upgrade3.mp3"); // base3 -> base4

    // Load points/tip sounds
    loadSound("points1", "/sounds/points1.mp3"); // Smallest tip
    loadSound("points2", "/sounds/points2.mp3");
    loadSound("points3", "/sounds/points3.mp3");
    loadSound("points4", "/sounds/points4.mp3");
    loadSound("points5", "/sounds/points5.mp3"); // Largest tip
    loadSound("pointsX", "/sounds/pointsX.mp3"); // Extra large tip

    // Future sounds can be loaded here as they become available:
    // loadSound("combat", "/sounds/combat.mp3");
    // loadSound("exit", "/sounds/exit.mp3");
    // loadSound("tip", "/sounds/tip.mp3");

    return () => {
      // Cleanup: pause and remove all audio elements
      Object.values(soundsRef.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, []);

  /**
   * Play a sound effect
   * @param type - The type of sound to play
   * @param volume - Volume level (0.0 to 1.0), defaults to 0.5
   * @param returnAudio - If true, returns the audio element for manual control
   * @returns The audio element if returnAudio is true, undefined otherwise
   */
  const playSound = useCallback(
    (type: SoundType, volume: number = 0.5, returnAudio: boolean = false): HTMLAudioElement | undefined => {
      const sound = soundsRef.current[type];

      if (!sound) {
        console.warn(`Sound not loaded: ${type}`);
        return undefined;
      }

      try {
        // For drill sounds, don't clone - use direct control
        // For other sounds, clone to allow multiple simultaneous plays
        const audioToUse = returnAudio ? new Audio(sound.src) : (sound.cloneNode() as HTMLAudioElement);
        audioToUse.volume = Math.max(0, Math.min(1, volume)); // Clamp volume between 0 and 1

        // Play the sound
        const playPromise = audioToUse.play();

        // Handle play promise (modern browsers require user interaction first)
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            // Ignore errors about user interaction (common on first page load)
            if (error.name !== "NotAllowedError") {
              console.error(`Failed to play sound: ${type}`, error);
            }
          });
        }

        // Clean up after sound finishes (unless caller wants to manage it)
        if (!returnAudio) {
          audioToUse.onended = () => {
            audioToUse.src = "";
          };
        }

        // Return the audio element if requested
        if (returnAudio) {
          return audioToUse;
        }
      } catch (error) {
        console.error(`Error playing sound: ${type}`, error);
      }
      return undefined;
    },
    [],
  );

  /**
   * Stop a playing audio element - AGGRESSIVELY
   * @param audio - The audio element to stop
   */
  const stopSound = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      // IMMEDIATELY mute the audio first - this is synchronous
      audio.volume = 0;
      // Remove the onended handler to prevent it from firing
      audio.onended = null;
      // Pause the audio
      audio.pause();
      // Remove the source to kill it completely
      audio.src = "";
      audio.load();
    } catch (error) {
      console.error("Error stopping sound:", error);
    }
  }, []);

  /**
   * Get the appropriate sonar sound for an asteroid based on its size
   * @param size - The asteroid size
   * @returns The sonar sound type to play
   */
  const getSonarForAsteroidSize = useCallback((size: number): SoundType => {
    // Map asteroid size to sonar sounds (1-5)
    // Assuming asteroid sizes range from ~30 to ~130
    if (size < 50) return "sonar1"; // Smallest
    if (size < 70) return "sonar2";
    if (size < 90) return "sonar3";
    if (size < 110) return "sonar4";
    return "sonar5"; // Largest
  }, []);

  /**
   * Get the appropriate ship sound for a ship based on its type
   * @param shipType - The ship type (1-12)
   * @returns The ship sound type to play
   */
  const getShipSoundForType = useCallback((shipType: number): SoundType => {
    // Map ship type to ship sounds (1-5)
    // Ship types 1-12, where lower numbers are smaller ships
    // ship1.wav = largest ships (Model E-F), ship5.wav = smallest ships (Model A-B)
    if (shipType >= 11) return "ship1"; // Largest (types 11-12, Models E-F)
    if (shipType >= 8) return "ship2"; // Large (types 8-10, Models D-E)
    if (shipType >= 5) return "ship3"; // Medium (types 5-7, Models C-D)
    if (shipType >= 3) return "ship4"; // Small (types 3-4, Models B-C)
    return "ship5"; // Smallest (types 1-2, Models A-B)
  }, []);

  /**
   * Get a random mining drill sound
   * @returns A random drill sound type
   */
  const getRandomDrillSound = useCallback((): SoundType => {
    const drillSounds: SoundType[] = ["drill1", "drill2", "drill3", "drill4"];
    const randomIndex = Math.floor(Math.random() * drillSounds.length);
    return drillSounds[randomIndex];
  }, []);

  /**
   * Play a drill sound using the shared drill audio element
   */
  const playDrillSound = useCallback(
    (volume: number = 0.5) => {
      // Stop any currently playing drill
      if (activeDrillAudioRef.current) {
        activeDrillAudioRef.current.pause();
        activeDrillAudioRef.current.currentTime = 0;
      }

      const drillType = getRandomDrillSound();
      const sound = soundsRef.current[drillType];

      if (!sound) {
        console.warn(`Drill sound not loaded: ${drillType}`);
        return;
      }

      // Create a new audio element for this drill sound
      const audio = new Audio(sound.src);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.playbackRate = 0.177;
      activeDrillAudioRef.current = audio;

      audio.play().catch(error => {
        if (error.name !== "NotAllowedError") {
          console.error(`Failed to play drill sound:`, error);
        }
      });
    },
    [getRandomDrillSound],
  );

  /**
   * Stop the currently playing drill sound
   */
  const stopDrillSound = useCallback(() => {
    if (activeDrillAudioRef.current) {
      const audio = activeDrillAudioRef.current;
      audio.volume = 0;
      audio.pause();
      audio.src = "";
      activeDrillAudioRef.current = null;
    }
  }, []);

  /**
   * Play a refuel sound using the shared refuel audio element
   */
  const playRefuelSound = useCallback((volume: number = 0.5) => {
    // Stop any currently playing refuel sound
    if (activeRefuelAudioRef.current) {
      activeRefuelAudioRef.current.pause();
      activeRefuelAudioRef.current.currentTime = 0;
    }

    const sound = soundsRef.current.refuel;

    if (!sound) {
      console.warn("Refuel sound not loaded");
      return;
    }

    // Create a new audio element for this refuel sound
    const audio = new Audio(sound.src);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.loop = true; // Loop the refuel sound while parked
    activeRefuelAudioRef.current = audio;

    audio.play().catch(error => {
      if (error.name !== "NotAllowedError") {
        console.error("Failed to play refuel sound:", error);
      }
    });
  }, []);

  /**
   * Stop the currently playing refuel sound
   */
  const stopRefuelSound = useCallback(() => {
    if (activeRefuelAudioRef.current) {
      const audio = activeRefuelAudioRef.current;
      audio.volume = 0;
      audio.pause();
      audio.src = "";
      activeRefuelAudioRef.current = null;
    }
  }, []);

  /**
   * Get the appropriate explosion sound for an asteroid based on its size
   * @param size - The asteroid size
   * @returns The explosion sound type to play
   */
  const getExplosionForAsteroidSize = useCallback((size: number): SoundType => {
    // Map asteroid size to explosion sounds (1-3)
    // Assuming asteroid sizes range from ~30 to ~130
    if (size < 70) return "explode1"; // Smallest
    if (size < 100) return "explode2"; // Medium
    return "explode3"; // Largest
  }, []);

  /**
   * Play ship attack sequence (blast1 then blast2)
   * @param volume - Volume level (0.0 to 1.0), defaults to 0.5
   */
  const playShipAttackSequence = useCallback((volume: number = 0.5) => {
    // Play blast1
    const blast1Sound = soundsRef.current.blast1;
    if (!blast1Sound) {
      console.warn("blast1 sound not loaded");
      return;
    }

    const blast1Audio = new Audio(blast1Sound.src);
    blast1Audio.volume = Math.max(0, Math.min(1, volume));

    blast1Audio.play().catch(error => {
      if (error.name !== "NotAllowedError") {
        console.error("Failed to play blast1 sound:", error);
      }
    });

    // When blast1 ends, play blast2
    blast1Audio.onended = () => {
      const blast2Sound = soundsRef.current.blast2;
      if (!blast2Sound) {
        console.warn("blast2 sound not loaded");
        return;
      }

      const blast2Audio = new Audio(blast2Sound.src);
      blast2Audio.volume = Math.max(0, Math.min(1, volume));

      blast2Audio.play().catch(error => {
        if (error.name !== "NotAllowedError") {
          console.error("Failed to play blast2 sound:", error);
        }
      });

      blast2Audio.onended = () => {
        blast2Audio.src = "";
      };
    };
  }, []);

  /**
   * Get a random death sound
   * @returns A random death sound type
   */
  const getRandomDeathSound = useCallback((): SoundType => {
    const deathSounds: SoundType[] = ["death1", "death2", "death3"];
    const randomIndex = Math.floor(Math.random() * deathSounds.length);
    return deathSounds[randomIndex];
  }, []);

  /**
   * Play ship destruction sequence (whipsplat, then random death sound after 0.5s)
   * @param volume - Volume level for death sound (0.0 to 1.0), defaults to 0.7
   */
  const playShipDestructionSequence = useCallback(
    (volume: number = 0.7) => {
      // Play whipsplat immediately
      const whipsplatSound = soundsRef.current.whipsplat;
      if (!whipsplatSound) {
        console.warn("whipsplat sound not loaded");
        return;
      }

      const whipsplatAudio = new Audio(whipsplatSound.src);
      whipsplatAudio.volume = 1.0; // Full volume for whipsplat

      whipsplatAudio.play().catch(error => {
        if (error.name !== "NotAllowedError") {
          console.error("Failed to play whipsplat sound:", error);
        }
      });

      whipsplatAudio.onended = () => {
        whipsplatAudio.src = "";
      };

      // After 0.5 seconds, play random death sound
      setTimeout(() => {
        const deathSoundType = getRandomDeathSound();
        const deathSound = soundsRef.current[deathSoundType];
        if (!deathSound) {
          console.warn(`${deathSoundType} sound not loaded`);
          return;
        }

        const deathAudio = new Audio(deathSound.src);
        deathAudio.volume = Math.max(0, Math.min(1, volume));

        deathAudio.play().catch(error => {
          if (error.name !== "NotAllowedError") {
            console.error(`Failed to play ${deathSoundType} sound:`, error);
          }
        });

        deathAudio.onended = () => {
          deathAudio.src = "";
        };
      }, 500); // 0.5 second delay
    },
    [getRandomDeathSound],
  );

  /**
   * Get the appropriate points sound based on tip amount
   * @param tipAmount - The tip amount received
   * @returns The points sound type to play
   */
  const getPointsSoundForTipAmount = useCallback((tipAmount: number): SoundType => {
    // Define tip ranges (you can adjust these thresholds based on your game economy)
    if (tipAmount <= 5) return "points1"; // Smallest tips (1-5)
    if (tipAmount <= 15) return "points2"; // Small tips (6-15)
    if (tipAmount <= 30) return "points3"; // Medium tips (16-30)
    if (tipAmount <= 50) return "points4"; // Large tips (31-50)
    if (tipAmount <= 100) return "points5"; // Very large tips (51-100)
    return "pointsX"; // Extra large tips (100+)
  }, []);

  return {
    playSound,
    stopSound,
    getSonarForAsteroidSize,
    getShipSoundForType,
    getRandomDrillSound,
    getExplosionForAsteroidSize,
    playDrillSound,
    stopDrillSound,
    playRefuelSound,
    stopRefuelSound,
    playShipAttackSequence,
    playShipDestructionSequence,
    getPointsSoundForTipAmount,
  };
};
