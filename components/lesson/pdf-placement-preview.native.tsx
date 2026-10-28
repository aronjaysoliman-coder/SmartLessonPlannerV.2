import React from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import { createPdfPlacementHtml } from './pdf-placement-html';
import { PdfPlacement } from './pdf-placement-types';

export function PdfPlacementPreview({
  base64Pdf,
  onPlace,
}: {
  base64Pdf: string;
  onPlace: (placement: PdfPlacement) => void;
}) {
  return (
    <View style={styles.frame}>
      <WebView
        originWhitelist={['*']}
        source={{ html: createPdfPlacementHtml(base64Pdf) }}
        javaScriptEnabled
        onMessage={(event) => {
          try {
            onPlace(JSON.parse(event.nativeEvent.data) as PdfPlacement);
          } catch (error) {
            console.error('[template] invalid PDF placement message:', error);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 460, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10 },
});
