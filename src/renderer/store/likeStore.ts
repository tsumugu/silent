import { create } from 'zustand';
import { zandle } from './zandle';

interface LikeState {
    likeStatuses: Record<string, 'LIKE' | 'DISLIKE' | 'INDIFFERENT'>;
    setLikeStatus: (videoId: string, status: 'LIKE' | 'DISLIKE' | 'INDIFFERENT') => void;
    getLikeStatus: (videoId: string) => 'LIKE' | 'DISLIKE' | 'INDIFFERENT' | undefined;
}

export const useLikeStore = create<LikeState>()(
    zandle<LikeState>({
        storeName: 'like',
        syncKeys: ['likeStatuses'], // Only sync likeStatuses
    })((set, get) => ({
        likeStatuses: {},

        setLikeStatus: (videoId: string, status: 'LIKE' | 'DISLIKE' | 'INDIFFERENT') => {
            set((state: LikeState) => ({
                likeStatuses: {
                    ...state.likeStatuses,
                    [videoId]: status
                }
            }));
        },

        getLikeStatus: (videoId: string) => {
            return get().likeStatuses[videoId];
        }
    }))
);
