import React, { useEffect, useMemo, useRef } from "react";
import { useTranscriptWebSocket } from "@/hooks/useTranscriptWebSocket";
import { languageNameMap } from "@/utils/language";
import "./Transcript.css";

const Transcript: React.FC = () => {
    const { utterances, targetLanguage } = useTranscriptWebSocket(
        "wss://meeting-data.bot.recall.ai/api/v1/transcript"
    );

    const currentLanguage = useMemo(
        () => (targetLanguage ? languageNameMap[targetLanguage] : "None"),
        [targetLanguage]
    );

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTo(0, 0);
        }
    }, [utterances]);

    let lastSpeaker: string | null = null;

    if (targetLanguage === null) {
        return (
            <div
                style={{
                    textAlign: "center",
                    padding: "1rem",
                    fontSize: "1.8rem",
                }}
            >
                What language would you like to translate to?
            </div>
        );
    }

    return (
        <>
            <div className="transcript-container" ref={containerRef}>
                {!utterances.length ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "1rem",
                            fontSize: "1.2rem",
                        }}
                    >
                        Start speaking to translate in real-time.
                    </div>
                ) : (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "0 0 2rem",
                            color: "lightgray",
                        }}
                    >
                        <span className="language-badge">
                            Translating to:{" "}
                            <span className="language-highlight">
                                {currentLanguage}
                            </span>
                        </span>
                    </div>
                )}
                {utterances
                    .slice()
                    .reverse() // Display the latest utterance at the top
                    .map((item, index) => {
                        const isNewSpeaker = item.speaker !== lastSpeaker;
                        lastSpeaker = item.speaker;

                        return (
                            <div key={index} className="transcript-item">
                                <div
                                    className="speaker-column"
                                    style={{
                                        fontWeight: isNewSpeaker
                                            ? "bold"
                                            : "normal",
                                        visibility: isNewSpeaker
                                            ? "visible"
                                            : "hidden",
                                    }}
                                >
                                    {isNewSpeaker && item.speaker
                                        ? `${item.speaker}`
                                        : ""}
                                </div>

                                <div className="utterance-column">
                                    <div
                                        className="translated-text"
                                        style={{
                                            color: item.color,
                                            opacity: item.color ? 0.6 : 1,
                                            fontWeight: item.color
                                                ? "normal"
                                                : "bold",
                                        }}
                                    >
                                        {item.translated || "(Translating...)"}
                                    </div>
                                    <div className="original-text">
                                        {item.original}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </>
    );
};

export default Transcript;
