import { useState, useEffect, useRef } from "react";
import Overlay from "../overlay";
import { giftEventBridge } from "../../core/giftEventBridge";
import { eventBus } from "../../core/eventBus";
import { rewardEngine } from "../../core/engines/rewardEngine";
import { battleEffectEngine } from "../../core/engines/battleEffectEngine";
import "./OverlayPreview.css";
import "../overlay.css";

export function OverlayPreview() {
  const [hudMode, setHudMode] = useState("team");

  // Isolated Demo State (Zero pollution to real localStorage or core managers)
  const [demoPlayers, setDemoPlayers] = useState([
    { id: "p_carlos", playerId: "p_carlos", name: "Carlos", displayName: "Carlos", teamId: "team1", points: 120, wins: 0 },
    { id: "p_luis", playerId: "p_luis", name: "Luis", displayName: "Luis", teamId: "team1", points: 95, wins: 0 },
    { id: "p_pedro", playerId: "p_pedro", name: "Pedro", displayName: "Pedro", teamId: "team1", points: 70, wins: 0 },
    { id: "p_juan", playerId: "p_juan", name: "Juan", displayName: "Juan", teamId: "team1", points: 50, wins: 0 },
    { id: "p_marco", playerId: "p_marco", name: "Marco", displayName: "Marco", teamId: "team1", points: 30, wins: 0 },
    { id: "p_andres", playerId: "p_andres", name: "Andrés", displayName: "Andrés", teamId: "team2", points: 115, wins: 0 },
    { id: "p_diego", playerId: "p_diego", name: "Diego", displayName: "Diego", teamId: "team2", points: 90, wins: 0 },
    { id: "p_jose", playerId: "p_jose", name: "José", displayName: "José", teamId: "team2", points: 65, wins: 0 },
    { id: "p_alex", playerId: "p_alex", name: "Alex", displayName: "Alex", teamId: "team2", points: 45, wins: 0 },
    { id: "p_mario", playerId: "p_mario", name: "Mario", displayName: "Mario", teamId: "team2", points: 25, wins: 0 }
  ]);

  const [demoTeams, setDemoTeams] = useState([
    { id: "team1", name: "EQUIPO 1 (TROPICAL)", icon: "🌴", points: 385, wins: 1 },
    { id: "team2", name: "EQUIPO 2 (VOLCÁN)", icon: "🌋", points: 340, wins: 0 }
  ]);

  const [demoRound, setDemoRound] = useState({ name: "RONDA 1 SHOWCASE", active: true });
  const [demoTimer, setDemoTimer] = useState({ minutes: 1, seconds: 0, running: true });

  // Direct visual test state triggers
  const [testDonut, setTestDonut] = useState(null);
  const [testHat, setTestHat] = useState(null);
  const [testGalaxy, setTestGalaxy] = useState(null);
  const [testMoneyGun, setTestMoneyGun] = useState(null);
  const [testEpicEvent, setTestEpicEvent] = useState(null);
  const [testGalaxyPopup, setTestGalaxyPopup] = useState(null);
  const [testFrozen, setTestFrozen] = useState(null);
  const [testFrozenDetails, setTestFrozenDetails] = useState(null);
  const [testEpicGift, setTestEpicGift] = useState(null);
  const [testHighlightedPlayer, setTestHighlightedPlayer] = useState(null);
  const [testScare, setTestScare] = useState(false);
  const [testShowWin, setTestShowWin] = useState(false);
  const [testWinner, setTestWinner] = useState(null);

  // Deterministic Showcase Demo state
  const [isShowcaseRunning, setIsShowcaseRunning] = useState(false);
  const [showcaseSpeed, setShowcaseSpeed] = useState(1);
  const [showcaseStepInfo, setShowcaseStepInfo] = useState("READY");
  const showcaseTimerRef = useRef(null);
  const showcaseStepIndexRef = useRef(0);

  const teamPlayerIds = {
    team1: ["p_carlos", "p_luis", "p_pedro", "p_juan", "p_marco"],
    team2: ["p_andres", "p_diego", "p_jose", "p_alex", "p_mario"]
  };
  const demoPlayerIds = ["p_carlos", "p_luis", "p_pedro", "p_juan", "p_marco", "p_andres", "p_diego", "p_jose", "p_alex", "p_mario"];

  const addPointsToDemoPlayer = (targetId, pts) => {
    setDemoPlayers(prev => prev.map(p => {
      if (p.id === targetId || p.playerId === targetId) {
        return { ...p, points: (p.points || 0) + pts };
      }
      return p;
    }));
    setDemoTeams(prev => prev.map(t => {
      const pObj = demoPlayers.find(p => p.id === targetId || p.playerId === targetId);
      if (pObj && pObj.teamId === t.id) {
        return { ...t, points: (t.points || 0) + pts };
      }
      return t;
    }));
  };

  // Deterministic Showcase Sequence definition
  const getShowcaseSequence = () => {
    return [
      {
        mode: "team",
        info: "TEAM SHOWCASE — STEP 1 / 5 — SCORE INCREASE",
        action: (ids) => {
          const target = teamPlayerIds.team1[0] || ids[0];
          addPointsToDemoPlayer(target, 15);
          highlightAndFlash(target);
        }
      },
      {
        mode: "team",
        info: "TEAM SHOWCASE — STEP 2 / 5 — RANK UP (LUIS OVERTAKES CARLOS)",
        action: (ids) => {
          const target = teamPlayerIds.team1[1] || ids[1];
          addPointsToDemoPlayer(target, 45);
          highlightAndFlash(target);
        }
      },
      {
        mode: "team",
        info: "TEAM SHOWCASE — STEP 3 / 5 — MVP CHANGE (PEDRO BECOMES MVP)",
        action: (ids) => {
          const target = teamPlayerIds.team1[2] || ids[2];
          addPointsToDemoPlayer(target, 80);
          highlightAndFlash(target);
        }
      },
      {
        mode: "team",
        info: "TEAM SHOWCASE — STEP 4 / 5 — SECOND TEAM SCORE & RANK UP",
        action: (ids) => {
          const target = teamPlayerIds.team2[1] || ids[6];
          addPointsToDemoPlayer(target, 55);
          highlightAndFlash(target);
        }
      },
      {
        mode: "team",
        info: "TEAM SHOWCASE — STEP 5 / 5 — REPETITION TEST (MARCO ASCENSION)",
        action: (ids) => {
          const target = teamPlayerIds.team1[4] || ids[4];
          addPointsToDemoPlayer(target, 90);
          highlightAndFlash(target);
        }
      },
      {
        mode: "individual",
        info: "INDIVIDUAL SHOWCASE — STEP 1 / 5 — SCORE CHANGE (+15)",
        action: (ids) => {
          const target = ids[3];
          addPointsToDemoPlayer(target, 60);
          highlightAndFlash(target);
        }
      },
      {
        mode: "individual",
        info: "INDIVIDUAL SHOWCASE — STEP 2 / 5 — MODERATE RANK UP",
        action: (ids) => {
          const target = ids[4];
          addPointsToDemoPlayer(target, 85);
          highlightAndFlash(target);
        }
      },
      {
        mode: "individual",
        info: "INDIVIDUAL SHOWCASE — STEP 3 / 5 — TOP ENTRY (MARIO ENTERS TOP 5)",
        action: (ids) => {
          const target = ids[9];
          addPointsToDemoPlayer(target, 120);
          highlightAndFlash(target);
        }
      },
      {
        mode: "individual",
        info: "INDIVIDUAL SHOWCASE — STEP 4 / 5 — TOP EXIT & REORGANIZATION",
        action: (ids) => {
          const target = ids[1];
          addPointsToDemoPlayer(target, 10);
          highlightAndFlash(target);
        }
      },
      {
        mode: "individual",
        info: "INDIVIDUAL SHOWCASE — STEP 5 / 5 — MULTI-RANK ASCENSION",
        action: (ids) => {
          const target = ids[8];
          addPointsToDemoPlayer(target, 140);
          highlightAndFlash(target);
        }
      }
    ];
  };

  const highlightAndFlash = (targetId) => {
    setTestHighlightedPlayer(targetId);
    setTimeout(() => setTestHighlightedPlayer(null), 1400);
  };

  useEffect(() => {
    if (isShowcaseRunning) {
      const sequence = getShowcaseSequence();
      const stepDuration = 3500 / showcaseSpeed;

      const runStep = () => {
        const index = showcaseStepIndexRef.current;
        if (index >= sequence.length) {
          setIsShowcaseRunning(false);
          setShowcaseStepInfo("SHOWCASE COMPLETE 🏆");
          return;
        }

        const currentStep = sequence[index];
        setHudMode(currentStep.mode);
        setShowcaseStepInfo(currentStep.info);
        currentStep.action(demoPlayerIds);

        showcaseStepIndexRef.current = index + 1;
        showcaseTimerRef.current = setTimeout(runStep, stepDuration);
      };

      runStep();
    } else {
      if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
    }

    return () => {
      if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
    };
  }, [isShowcaseRunning, showcaseSpeed]);

  const handleStartShowcase = () => {
    showcaseStepIndexRef.current = 0;
    setIsShowcaseRunning(true);
  };

  const handleStopShowcase = () => {
    setIsShowcaseRunning(false);
    setShowcaseStepInfo("SHOWCASE STOPPED ⏹️");
    if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
  };

  const handleResetPreview = () => {
    setIsShowcaseRunning(false);
    if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
    showcaseStepIndexRef.current = 0;
    setDemoPlayers([
      { id: "p_carlos", playerId: "p_carlos", name: "Carlos", displayName: "Carlos", teamId: "team1", points: 120, wins: 0 },
      { id: "p_luis", playerId: "p_luis", name: "Luis", displayName: "Luis", teamId: "team1", points: 95, wins: 0 },
      { id: "p_pedro", playerId: "p_pedro", name: "Pedro", displayName: "Pedro", teamId: "team1", points: 70, wins: 0 },
      { id: "p_juan", playerId: "p_juan", name: "Juan", displayName: "Juan", teamId: "team1", points: 50, wins: 0 },
      { id: "p_marco", playerId: "p_marco", name: "Marco", displayName: "Marco", teamId: "team1", points: 30, wins: 0 },
      { id: "p_andres", playerId: "p_andres", name: "Andrés", displayName: "Andrés", teamId: "team2", points: 115, wins: 0 },
      { id: "p_diego", playerId: "p_diego", name: "Diego", displayName: "Diego", teamId: "team2", points: 90, wins: 0 },
      { id: "p_jose", playerId: "p_jose", name: "José", displayName: "José", teamId: "team2", points: 65, wins: 0 },
      { id: "p_alex", playerId: "p_alex", name: "Alex", displayName: "Alex", teamId: "team2", points: 45, wins: 0 },
      { id: "p_mario", playerId: "p_mario", name: "Mario", displayName: "Mario", teamId: "team2", points: 25, wins: 0 }
    ]);
    setTestDonut(null);
    setTestHat(null);
    setTestGalaxy(null);
    setTestMoneyGun(null);
    setTestEpicEvent(null);
    setTestGalaxyPopup(null);
    setTestFrozen(null);
    setTestFrozenDetails(null);
    setTestEpicGift(null);
    setTestScare(false);
    setTestShowWin(false);
    setTestWinner(null);
    setShowcaseStepInfo("READY");
  };

  const handleScoreAction = (pointsToAdd) => {
    if (demoPlayerIds.length === 0) return;
    const targetId = demoPlayerIds[0];
    addPointsToDemoPlayer(targetId, pointsToAdd);
    highlightAndFlash(targetId);
  };

  const handleRandomScoreEvent = () => {
    if (demoPlayerIds.length === 0) return;
    const randomId = demoPlayerIds[Math.floor(Math.random() * demoPlayerIds.length)];
    const pts = Math.floor(Math.random() * 60) + 10;
    addPointsToDemoPlayer(randomId, pts);
    highlightAndFlash(randomId);
  };

  const handleForceRankUp = () => {
    if (demoPlayerIds.length < 2) return;
    const bottomId = demoPlayerIds[demoPlayerIds.length - 1];
    addPointsToDemoPlayer(bottomId, 250);
    highlightAndFlash(bottomId);
  };

  const handleForceMvpChange = () => {
    if (demoPlayerIds.length < 2) return;
    const secondId = demoPlayerIds[1];
    addPointsToDemoPlayer(secondId, 180);
    highlightAndFlash(secondId);
  };

  // Pipeline events listener for preview FX
  useEffect(() => {
    const unsubStarted = eventBus.subscribe("ability:started", (item) => {
      const giftName = item.sourceGift || "Gift";
      const icon = item.display?.icon || "🎁";
      setTestEpicGift({ giftName, username: item.sender || "Viewer", icon });
      setTimeout(() => setTestEpicGift(null), 1200);

      if (item.abilityId === "silent_challenge") {
        setTestDonut(item.teamId || "team1");
        setTestEpicEvent({
          giftDisplay: `🍩 ${giftName.toUpperCase()} x5`,
          tagline: item.display?.name ? `EL MUDO • ${item.display.name.toUpperCase()}` : "EL MUDO • RETO ACTIVO",
          username: item.sender || "ANNA"
        });
      } else if (item.abilityId === "creative_challenge") {
        setTestHat(item.teamId || "team1");
        setTestEpicEvent({
          giftDisplay: `🤠 ${giftName.toUpperCase()}`,
          tagline: item.display?.name ? `RETO CREATIVO • ${item.display.name.toUpperCase()}` : "RETO CREATIVO ACTIVO",
          username: item.sender || "FERNANDO"
        });
      } else if (item.abilityId === "ultimate_galaxy") {
        setTestGalaxy(item.teamId || "team1");
        setTestGalaxyPopup({
          sender: item.sender || "FERNANDO",
          phrase: item.phrase || "⚡ ULTIMATE ACTIVATED ⚡"
        });
        setTestEpicEvent({
          giftDisplay: `🌌 ${giftName.toUpperCase()} x1`,
          tagline: "ULTIMATE GALAXY ENERGY",
          username: item.sender || "FERNANDO"
        });
      } else if (item.abilityId === "epic_impact") {
        setTestMoneyGun(item.teamId || "team2");
        setTestEpicEvent({
          giftDisplay: `💥 ${giftName.toUpperCase()} x1`,
          tagline: "EPIC IMPACT BULLET STORM",
          username: item.sender || "FERNANDO"
        });
      }
    });

    const unsubFinished = eventBus.subscribe("ability:finished", (item) => {
      if (item.abilityId === "silent_challenge") setTestDonut(null);
      if (item.abilityId === "creative_challenge") setTestHat(null);
      if (item.abilityId === "ultimate_galaxy") {
        setTestGalaxy(null);
        setTestGalaxyPopup(null);
      }
      if (item.abilityId === "epic_impact") setTestMoneyGun(null);
      setTestEpicEvent(null);
    });

    const unsubActivated = eventBus.subscribe("effect:activated", (effect) => {
      if (effect.type === "FREEZE") {
        setTestEpicGift({ giftName: "Freeze", username: effect.activatedBy || "FERNANDO", icon: "🧊" });
        setTimeout(() => setTestEpicGift(null), 1200);
        setTestFrozen(effect.affectedTeamId || "team1");
        setTestFrozenDetails({ remainingTime: effect.totalDuration || 30, activatedBy: effect.activatedBy || "FERNANDO" });
      }
    });

    const unsubRemoved = eventBus.subscribe("effect:removed", () => {
      setTestFrozen(null);
      setTestFrozenDetails(null);
    });

    const unsubExpired = eventBus.subscribe("effect:expired", () => {
      setTestFrozen(null);
      setTestFrozenDetails(null);
    });

    return () => {
      unsubStarted();
      unsubFinished();
      unsubActivated();
      unsubRemoved();
      unsubExpired();
    };
  }, []);

  const handleSendGift = (giftId, username, quantity = 1) => {
    giftEventBridge.processExternalGift({
      giftId: giftId,
      giftName: giftId,
      username: username,
      quantity: quantity,
      diamondValue: giftId === "Galaxy" ? 1000 : 30,
      source: "preview_simulator"
    });
  };

  const handleDirectDonut = () => {
    setTestEpicGift({ giftName: "Doughnut", username: "ANNA", icon: "🍩" });
    setTimeout(() => {
      setTestEpicGift(null);
      setTestDonut("team1");
      setTestEpicEvent({ giftDisplay: "🍩 DOUGHNUT x5", tagline: "EL MUDO • RETO ACTIVO", username: "ANNA" });
    }, 1200);
    setTimeout(() => {
      setTestDonut(null);
      setTestEpicEvent(null);
    }, 10000);
  };

  const handleDirectCowboy = () => {
    setTestEpicGift({ giftName: "Hat and Mustache", username: "FERNANDO", icon: "🤠" });
    setTimeout(() => {
      setTestEpicGift(null);
      setTestHat("team1");
      setTestEpicEvent({ giftDisplay: "🤠 HAT AND MUSTACHE", tagline: "RETO CREATIVO ACTIVO", username: "FERNANDO" });
    }, 1200);
    setTimeout(() => {
      setTestHat(null);
      setTestEpicEvent(null);
    }, 10000);
  };

  const handleDirectGalaxy = () => {
    setTestEpicGift({ giftName: "Galaxy", username: "FERNANDO", icon: "🌌" });
    setTimeout(() => {
      setTestEpicGift(null);
      setTestGalaxy("team1");
      setTestGalaxyPopup({ sender: "FERNANDO", phrase: "⚡ ULTIMATE ACTIVATED ⚡" });
      setTestEpicEvent({ giftDisplay: "🌌 GALAXY x1", tagline: "ULTIMATE GALAXY ENERGY", username: "FERNANDO" });
    }, 1200);
    setTimeout(() => {
      setTestGalaxy(null);
      setTestGalaxyPopup(null);
      setTestEpicEvent(null);
    }, 10000);
  };

  const handleDirectMoneyGun = () => {
    setTestEpicGift({ giftName: "Money Gun", username: "FERNANDO", icon: "💥" });
    setTimeout(() => {
      setTestEpicGift(null);
      setTestMoneyGun("team2");
      setTestEpicEvent({ giftDisplay: "💥 MONEY GUN x1", tagline: "EPIC IMPACT BULLET STORM", username: "FERNANDO" });
    }, 1200);
    setTimeout(() => {
      setTestMoneyGun(null);
      setTestEpicEvent(null);
    }, 10000);
  };

  const handleDirectFreeze = () => {
    setTestEpicGift({ giftName: "Twinkling Star", username: "FERNANDO", icon: "🧊" });
    setTimeout(() => {
      setTestEpicGift(null);
      setTestFrozen("team1");
      setTestFrozenDetails({ remainingTime: "10", activatedBy: "FERNANDO" });
    }, 1200);
    setTimeout(() => {
      setTestFrozen(null);
      setTestFrozenDetails(null);
    }, 10000);
  };

  const handleDirectScare = () => {
    setTestScare(true);
    setTestEpicGift({ giftName: "Amped Up", username: "GHOST", icon: "😱" });
    setTimeout(() => {
      setTestScare(false);
      setTestEpicGift(null);
    }, 1200);
  };

  const handleDirectGoPopular = () => {
    eventBus.publish("cocazo:trigger", {
      username: "FERNANDO",
      giftName: "Coconut"
    });
  };

  return (
    <div className="overlay-preview-wrapper">
      {/* Simulation / Preview Isolation Banner */}
      <div style={{
        background: "linear-gradient(90deg, #ff9900, #ff3366)",
        color: "#fff",
        fontSize: "10px",
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "1.5px",
        padding: "4px 16px",
        borderRadius: "4px",
        boxShadow: "0 2px 10px rgba(255,51,102,0.5)",
        textAlign: "center",
        width: "100%",
        maxWidth: "900px",
        boxSizing: "border-box"
      }}>
        ⚠️ PREVIEW / SIMULATION — ISOLATED DEMO (0% LIVE POLLUTION) ⚠️
      </div>

      <div className="preview-controls">
        <div className="preview-row" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            🎬 DETERMINISTIC SHOWCASE DEMO CONTROLS
          </span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              className="preview-btn"
              onClick={() => setHudMode(prev => prev === "team" ? "individual" : "team")}
              style={{ background: hudMode === "team" ? "linear-gradient(135deg, #00f5ff, #0099ff)" : "linear-gradient(135deg, #ff00ff, #7800ff)", color: "#000", padding: "4px 10px" }}
            >
              🔄 Mode: {hudMode === "team" ? "Team Mode" : "Individual Mode"}
            </button>
            <button
              className="preview-btn"
              onClick={handleResetPreview}
              style={{ background: "linear-gradient(135deg, #ff3333, #990000)", color: "#fff", padding: "4px 8px" }}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Showcase Step Status Banner */}
        <div style={{
          background: "rgba(0, 245, 255, 0.15)",
          border: "1px solid #00f5ff",
          color: "#00ffcc",
          fontSize: "9px",
          fontWeight: 900,
          padding: "4px 8px",
          borderRadius: "4px",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.8px"
        }}>
          STATUS: {showcaseStepInfo}
        </div>

        {/* Deterministic Showcase Demo & Speed Controls */}
        <div className="preview-row" style={{ background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "4px" }}>
          <span style={{ fontSize: "9px", color: "#39ff88", fontWeight: 800, minWidth: "75px" }}>Showcase:</span>
          <div className="preview-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
            <button
              className="preview-btn"
              onClick={handleStartShowcase}
              disabled={isShowcaseRunning}
              style={{ background: isShowcaseRunning ? "#555" : "linear-gradient(135deg, #39ff88, #00aa55)", color: "#000", fontWeight: 900 }}
            >
              ▶ SHOWCASE DEMO
            </button>
            <button
              className="preview-btn"
              onClick={handleStopShowcase}
              disabled={!isShowcaseRunning}
              style={{ background: !isShowcaseRunning ? "#555" : "linear-gradient(135deg, #ff3333, #990000)", color: "#fff", fontWeight: 900 }}
            >
              ■ STOP DEMO
            </button>
            <div style={{ display: "flex", gap: "2px", gridColumn: "span 2", alignItems: "center", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "8px", color: "#ffd700", fontWeight: 800 }}>Speed:</span>
              <button className="preview-btn" onClick={() => setShowcaseSpeed(0.5)} style={{ background: showcaseSpeed === 0.5 ? "#ffd700" : "#333", color: showcaseSpeed === 0.5 ? "#000" : "#fff", padding: "2px 6px" }}>0.5x</button>
              <button className="preview-btn" onClick={() => setShowcaseSpeed(1)} style={{ background: showcaseSpeed === 1 ? "#ffd700" : "#333", color: showcaseSpeed === 1 ? "#000" : "#fff", padding: "2px 6px" }}>1x</button>
              <button className="preview-btn" onClick={() => setShowcaseSpeed(2)} style={{ background: showcaseSpeed === 2 ? "#ffd700" : "#333", color: showcaseSpeed === 2 ? "#000" : "#fff", padding: "2px 6px" }}>2x</button>
            </div>
          </div>
        </div>

        {/* Manual Simulation Actions */}
        <div className="preview-row">
          <span style={{ fontSize: "9px", color: "#ffd700", fontWeight: 800, minWidth: "75px" }}>Manual:</span>
          <div className="preview-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(85px, 1fr))" }}>
            <button className="preview-btn" onClick={() => handleScoreAction(1)} style={{ background: "linear-gradient(135deg, #00ffcc, #0099ff)", color: "#000" }}>+1 PTS</button>
            <button className="preview-btn" onClick={() => handleScoreAction(5)} style={{ background: "linear-gradient(135deg, #00ffcc, #0099ff)", color: "#000" }}>+5 PTS</button>
            <button className="preview-btn" onClick={() => handleScoreAction(10)} style={{ background: "linear-gradient(135deg, #00ff80, #00f5ff)", color: "#000" }}>+10 PTS</button>
            <button className="preview-btn" onClick={() => handleScoreAction(50)} style={{ background: "linear-gradient(135deg, #ffd700, #ff8800)", color: "#000" }}>+50 PTS</button>
            <button className="preview-btn" onClick={() => handleScoreAction(100)} style={{ background: "linear-gradient(135deg, #ff00ff, #7800ff)", color: "#fff" }}>+100 PTS</button>
            <button className="preview-btn" onClick={handleRandomScoreEvent} style={{ background: "linear-gradient(135deg, #39ff88, #00aa55)", color: "#000" }}>🎲 Random Event</button>
            <button className="preview-btn" onClick={handleForceRankUp} style={{ background: "linear-gradient(135deg, #ffd700, #ff3366)", color: "#000" }}>🚀 Force Rank Up</button>
            <button className="preview-btn" onClick={handleForceMvpChange} style={{ background: "linear-gradient(135deg, #ff3366, #7800ff)", color: "#fff" }}>👑 Force MVP Change</button>
          </div>
        </div>

        {/* Pipeline & Direct FX */}
        <div className="preview-row">
          <span style={{ fontSize: "9px", color: "#00ff80", fontWeight: 800, minWidth: "75px" }}>Pipeline:</span>
          <div className="preview-grid">
            <button className="preview-btn" onClick={() => handleSendGift("doughnut", "ANNA", 5)} style={{ background: "linear-gradient(135deg, #0088cc, #00f5ff)", color: "#000" }}>🍩 Doughnut</button>
            <button className="preview-btn" onClick={() => handleSendGift("hat_and_mustache", "FERNANDO", 1)} style={{ background: "linear-gradient(135deg, #ff6622, #cc3300)" }}>🤠 Hat</button>
            <button className="preview-btn" onClick={() => handleSendGift("galaxy", "FERNANDO", 1)} style={{ background: "linear-gradient(135deg, #00f5ff, #7800ff)" }}>🌌 Galaxy</button>
            <button className="preview-btn" onClick={() => handleSendGift("money_gun", "FERNANDO", 1)} style={{ background: "linear-gradient(135deg, #ff3333, #990000)" }}>💵 MoneyGun</button>
            <button className="preview-btn" onClick={() => handleSendGift("twinkling_star", "FERNANDO", 1)} style={{ background: "linear-gradient(135deg, #00f5ff, #0055ff)", color: "#000" }}>⭐ Star</button>
          </div>
        </div>

        <div className="preview-row">
          <span style={{ fontSize: "9px", color: "#ff3366", fontWeight: 800, minWidth: "75px" }}>Direct FX:</span>
          <div className="preview-grid">
            <button className="preview-btn" onClick={handleDirectDonut} style={{ background: "linear-gradient(135deg, #00f5ff, #0088cc)", color: "#000" }}>🍩 Doughnut (10s)</button>
            <button className="preview-btn" onClick={handleDirectCowboy} style={{ background: "linear-gradient(135deg, #ff9933, #ff6622)", color: "#000" }}>🤠 Hat (10s)</button>
            <button className="preview-btn" onClick={handleDirectGalaxy} style={{ background: "linear-gradient(135deg, #ffd700, #00f5ff)", color: "#000" }}>🌌 Galaxy (10s)</button>
            <button className="preview-btn" onClick={handleDirectMoneyGun} style={{ background: "linear-gradient(135deg, #ff4d4d, #990000)" }}>💵 MoneyGun (10s)</button>
            <button className="preview-btn" onClick={handleDirectFreeze} style={{ background: "linear-gradient(135deg, #00f5ff, #0088cc)", color: "#000" }}>⭐ Freeze (10s)</button>
            <button className="preview-btn" onClick={handleDirectScare} style={{ background: "linear-gradient(135deg, #ff0000, #990000)", color: "#fff", fontWeight: 900 }}>😱 Amped Up</button>
            <button className="preview-btn" onClick={handleDirectGoPopular} style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000", fontWeight: 900, gridColumn: "span 2" }}>🥥 COCONUT COCAZO</button>
          </div>
        </div>
      </div>

      <div className="preview-screen">
        <Overlay
          mode={hudMode}
          testPlayers={demoPlayers}
          testTeams={demoTeams}
          testRound={demoRound}
          testTimer={demoTimer}
          testLiveActive={true}
          testDonutTeamId={testDonut}
          testHatTeamId={testHat}
          testGalaxyTeamId={testGalaxy}
          testMoneyGunTeamId={testMoneyGun}
          testEpicEvent={testEpicEvent}
          testGalaxyPopup={testGalaxyPopup}
          testFrozenTeamId={testFrozen}
          testFrozenDetails={testFrozenDetails}
          testEpicGift={testEpicGift}
          testHighlightedPlayerId={testHighlightedPlayer}
          testScare={testScare}
          testShowWin={testShowWin}
          testWinner={testWinner}
        />
      </div>
    </div>
  );
}

export default OverlayPreview;
