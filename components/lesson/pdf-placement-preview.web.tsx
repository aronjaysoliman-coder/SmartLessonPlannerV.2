import React, { createElement, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { createPdfPlacementHtml } from './pdf-placement-html';
import type { PdfPlacement } from './pdf-placement-types';

export function PdfPlacementPreview({
  base64Pdf,
  onPlace,
}: {
  base64Pdf: string;
  onPlace: (placement: PdfPlacement) => void;
}) {
  useEffect(() => {
    function receivePlacement(event: MessageEvent) {
      if (event.data?.source === 'pdf-field-placement') {
        onPlace(event.data.data as PdfPlacement);
      }
    }
    window.addEventListener('message', receivePlacement);
    return () => window.removeEventListener('message', receivePlacement);
  }, [onPlace]);

  return (
    <View style={styles.frame}>
      {createElement('iframe', {
        title: 'Lesson plan template field placement',
        srcDoc: createPdfPlacementHtml(base64Pdf),
        sandbox: 'allow-scripts',
        style: { width: '100%', height: '100%', border: 0 },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 460, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10 },
});
