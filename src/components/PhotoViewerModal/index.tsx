import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Modal,
  useWindowDimensions,
  GestureResponderEvent,
} from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

interface PhotoViewerModalProps {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onDismiss: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  visible,
  photos,
  initialIndex,
  onDismiss,
}) => {
  const theme = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const flatListRef = useRef<FlatList<string>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dismissThreshold = Math.min(90, windowHeight * 0.12);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!visible || photos.length === 0) {
      return;
    }

    const boundedIndex = Math.min(Math.max(initialIndex, 0), photos.length - 1);
    setCurrentIndex(boundedIndex);

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: boundedIndex,
        animated: false,
      });
    });
  }, [visible, initialIndex, photos.length, windowWidth]);

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < photos.length - 1;

  const goLeft = () => {
    if (!canGoLeft) {
      return;
    }

    const nextIndex = currentIndex - 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const goRight = () => {
    if (!canGoRight) {
      return;
    }

    const nextIndex = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const handleScrollEnd = (offsetX: number) => {
    const index = Math.round(offsetX / windowWidth);
    const boundedIndex = Math.min(Math.max(index, 0), photos.length - 1);
    setCurrentIndex(boundedIndex);
  };

  const dismissWithSwipe = () => {
    onDismiss();
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      return;
    }

    touchStartRef.current = {
      x: touch.pageX,
      y: touch.pageY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    const touchStart = touchStartRef.current;
    const touch = event.nativeEvent.changedTouches[0];

    if (!touchStart || !touch) {
      return;
    }

    const dx = touch.pageX - touchStart.x;
    const dy = touch.pageY - touchStart.y;
    const durationMs = Date.now() - touchStart.time;

    const verticalDistance = Math.abs(dy);
    const horizontalDistance = Math.abs(dx);

    const isStrongVerticalSwipe =
      verticalDistance > dismissThreshold && verticalDistance > horizontalDistance * 1.15;
    const isQuickVerticalFlick =
      durationMs < 220 && verticalDistance > 30 && verticalDistance > horizontalDistance;

    if (isStrongVerticalSwipe || isQuickVerticalFlick) {
      dismissWithSwipe();
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <Modal visible={visible} onRequestClose={onDismiss} animationType="fade" transparent>
      <View style={[styles.viewerContainer, { backgroundColor: theme.colors.scrim }]}> 
        <View style={styles.topBar}>
          <Text variant="bodyLarge" style={styles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
          <IconButton
            icon="close"
            size={28}
            onPress={onDismiss}
            iconColor={theme.colors.onPrimary}
            accessibilityLabel="Close photo viewer"
          />
        </View>

        <View
          style={[styles.photoContainer, { height: windowHeight - 100 }]}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <FlatList
            ref={flatListRef}
            data={photos}
            keyExtractor={(item, index) => `${item}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
            renderItem={({ item }) => (
              <View style={[styles.slide, { width: windowWidth }]}> 
                <Image source={{ uri: item }} style={styles.photo} resizeMode="contain" />
              </View>
            )}
            onMomentumScrollEnd={(event) => handleScrollEnd(event.nativeEvent.contentOffset.x)}
            onScrollToIndexFailed={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
              }, 50);
            }}
          />

          <IconButton
            icon="chevron-left"
            size={36}
            onPress={goLeft}
            disabled={!canGoLeft}
            iconColor={theme.colors.onPrimary}
            containerColor={theme.colors.backdrop}
            style={[styles.navigationButton, styles.leftButton]}
            accessibilityLabel="View previous photo"
          />

          <IconButton
            icon="chevron-right"
            size={36}
            onPress={goRight}
            disabled={!canGoRight}
            iconColor={theme.colors.onPrimary}
            containerColor={theme.colors.backdrop}
            style={[styles.navigationButton, styles.rightButton]}
            accessibilityLabel="View next photo"
          />
        </View>

        <Text variant="bodySmall" style={styles.hintText}>
          Swipe up or down to close
        </Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  viewerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  counterText: {
    color: '#fff',
    fontWeight: '600',
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slide: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '85%',
  },
  navigationButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
  },
  leftButton: {
    left: 8,
  },
  rightButton: {
    right: 8,
  },
  hintText: {
    textAlign: 'center',
    color: '#fff',
    opacity: 0.9,
    marginTop: 8,
  },
});
