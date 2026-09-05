import { useState, useEffect, useCallback, useRef } from 'react';

const WS_RECONNECT_DELAY = 3000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;

export function usePollSocket(user) {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef(null);

    // Callback refs to handle updates
    const onPollCreatedRef = useRef(null);
    const onPollUpdatedRef = useRef(null);

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    const token = localStorage.getItem('accessToken');

    const connect = useCallback(() => {
        if (!user || !token) return;

        try {
            const wsUrl = `${WS_URL}?token=${token}&source=polls`;
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('Poll socket connected');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (err) {
                    console.error('Failed to parse poll socket message:', err);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('Poll socket error:', error);
            };

            wsRef.current.onclose = (event) => {
                console.log('Poll socket closed:', event.code);
                setIsConnected(false);

                if (event.code !== 1000 && reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current++;
                    reconnectTimeoutRef.current = setTimeout(connect, WS_RECONNECT_DELAY);
                }
            };
        } catch (error) {
            console.error('Failed to connect poll socket:', error);
        }
    }, [user, token, WS_URL]);

    const handleMessage = useCallback((data) => {
        switch (data.type) {
            case 'poll:created':
                if (onPollCreatedRef.current) {
                    onPollCreatedRef.current(data.poll);
                }
                break;

            case 'poll:updated':
                if (onPollUpdatedRef.current) {
                    onPollUpdatedRef.current(data.updatedPoll || {
                        id: data.pollId,
                        votes: data.votes,
                        total_votes: data.total_votes
                    });
                }
                break;

            default:
                // Ignore other messages
                break;
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close(1000, 'User disconnected');
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    useEffect(() => {
        if (user) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [user]);

    // Methods to register callbacks
    const onPollCreated = useCallback((callback) => {
        onPollCreatedRef.current = callback;
    }, []);

    const onPollUpdated = useCallback((callback) => {
        onPollUpdatedRef.current = callback;
    }, []);

    return {
        isConnected,
        onPollCreated,
        onPollUpdated
    };
}

export default usePollSocket;
