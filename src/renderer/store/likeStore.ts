import { create } from 'zustand';

interface LikeState {
    likeStatuses: Record<string, 'LIKE' | 'DISLIKE' | 'INDIFFERENT'>;
    setLikeStatus: (videoId: string, status: 'LIKE' | 'DISLIKE' | 'INDIFFERENT') => void;
    getLikeStatus: (videoId: string) => 'LIKE' | 'DISLIKE' | 'INDIFFERENT' | undefined;
}

export const useLikeStore = create<LikeState>((set, get) => ({
    likeStatuses: {},

    setLikeStatus: (videoId, status) => {
        set((state) => ({
            likeStatuses: {
                ...state.likeStatuses,
                [videoId]: status
            }
        }));
    },

    getLikeStatus: (videoId) => {
        return get().likeStatuses[videoId];
    }
}));
