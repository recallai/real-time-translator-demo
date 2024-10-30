import { useEffect, useMemo, useRef, useState } from "react";
import { LanguageCode, languageNameMap } from "@/utils/language";
import { translateText } from "@/utils/translate";
import {
    detectLanguageChangeCommand,
    findLanguageInText,
} from "@/utils/language";

interface Word {
    text: string;
    start_time: number;
    end_time: number;
}

interface Transcript {
    speaker: string | null;
    speaker_id: string | null;
    transcription_provider_speaker?: string;
    language: string | null;
    original_transcript_id: number;
    words: Word[];
    is_final: boolean;
}

interface TranscriptMessage {
    bot_id: string;
    transcript: Transcript;
}

interface Utterance {
    speaker: string | null;
    original: string;
    translated: string;
    color?: string;
}

export const useTranscriptWebSocket = (wsUrl: string) => {
    const RECONNECT_RETRY_INTERVAL_MS = 3000;

    const targetLanguageRef = useRef<LanguageCode | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const retryIntervalRef = useRef<number | null>(null);

    const [finalizedUtterances, setFinalizedUtterances] = useState<Utterance[]>(
        []
    );
    const [currentUtterance, setCurrentUtterance] = useState<Utterance | null>(
        null
    );

    const connectWebSocket = () => {
        if (wsRef.current) return;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
            console.log("Connected to WebSocket server");
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
            }
        };

        wsRef.current.onmessage = async (event: MessageEvent) => {
            const message = JSON.parse(event.data) as TranscriptMessage;
            const transcript = message.transcript;
            const originalText = transcript.words
                .map((word) => word.text)
                .join(" ");

            if (!targetLanguageRef.current) {
                const targetLanguage = findLanguageInText(originalText);
                if (targetLanguage) {
                    targetLanguageRef.current = targetLanguage;
                }
                return;
            }

            const newLanguage = detectLanguageChangeCommand(originalText);
            if (newLanguage) {
                if (newLanguage && newLanguage !== targetLanguageRef.current) {
                    targetLanguageRef.current = newLanguage;

                    setFinalizedUtterances((prev) => [
                        ...prev,
                        {
                            speaker: null,
                            original: "",
                            translated: `Now translating to ${languageNameMap[newLanguage]}`,
                            color: "#ff8c00",
                        },
                    ]);
                } else {
                    console.error(`Language not found: ${newLanguage}`);
                }
            }

            const translated = await translateText(
                originalText,
                targetLanguageRef.current
            );

            if (!transcript.is_final) {
                setCurrentUtterance({
                    speaker: transcript.speaker,
                    original: originalText,
                    translated,
                });
            } else {
                setFinalizedUtterances((prev) => [
                    ...prev,
                    {
                        speaker: transcript.speaker,
                        original: originalText,
                        translated,
                    },
                ]);
                setCurrentUtterance(null);
            }
        };

        wsRef.current.onclose = () => {
            console.log("WebSocket closed. Attempting to reconnect...");
            wsRef.current = null;
            attemptReconnect();
        };

        wsRef.current.onerror = (error: Event) => {
            console.error("WebSocket error:", error);
            wsRef.current?.close();
        };
    };

    const attemptReconnect = () => {
        if (!retryIntervalRef.current) {
            retryIntervalRef.current = window.setInterval(() => {
                console.log("Attempting to reconnect to WebSocket...");
                connectWebSocket();
            }, RECONNECT_RETRY_INTERVAL_MS);
        }
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
            }
        };
    }, []);

    // This could get super long for really long conversations.
    // Consider limiting the number of utterances stored.
    const utterances = useMemo(() => {
        if (currentUtterance) {
            return [...finalizedUtterances, currentUtterance];
        }
        return finalizedUtterances;
    }, [finalizedUtterances, currentUtterance]);

    return {
        utterances,
        targetLanguage: targetLanguageRef.current,
    };
};
