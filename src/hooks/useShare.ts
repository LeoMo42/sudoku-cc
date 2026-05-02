import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shareOrCopy, buildShareUrl, formatElapsed } from '../utils/share';
import type { DifficultyLevel, SudokuTypeId } from '../types/index';

interface UseShareParams {
  sudokuType: SudokuTypeId;
  difficulty: DifficultyLevel;
  elapsedTime: number;
}

interface UseShareReturn {
  handleShare: () => Promise<void>;
  shareToastVisible: boolean;
}

/**
 * Owns the "share my completed game" button: builds the deep-link + share text,
 * delegates to the navigator.share / clipboard fallback in utils/share, and
 * shows the "copied!" toast for 2.5s when we hit the clipboard branch.
 *
 * Toast visibility is local state instead of being lifted because nothing
 * outside the share button cares about it.
 */
export function useShare({ sudokuType, difficulty, elapsedTime }: UseShareParams): UseShareReturn {
  const { t } = useTranslation();
  const [shareToastVisible, setShareToastVisible] = useState(false);

  const handleShare = useCallback(async () => {
    const typeName = t(`sudokuTypes.${sudokuType}.name`);
    const diffName = t(`difficulty.${difficulty}`);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = buildShareUrl(sudokuType, difficulty, baseUrl);
    const text = t('game.shareText', { type: typeName, difficulty: diffName, time: formatElapsed(elapsedTime) });
    const outcome = await shareOrCopy(text, url);
    if (outcome === 'copied') {
      setShareToastVisible(true);
      setTimeout(() => setShareToastVisible(false), 2500);
    }
  }, [t, sudokuType, difficulty, elapsedTime]);

  return { handleShare, shareToastVisible };
}
