import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Text from './Text';
import {
  ApiTable,
  SchemaColor,
  SectionSchema,
} from '../api/reservations';

const GREEN = '#8DBB00';

function toRgba(color?: SchemaColor, fallback = 'transparent'): string {
  if (!color) return fallback;
  const r = Math.round(color.r ?? 0);
  const g = Math.round(color.g ?? 0);
  const b = Math.round(color.b ?? 0);
  const raw = color.a ?? 1;
  const a = raw > 1 ? +(raw / 255).toFixed(2) : +raw.toFixed(2);
  return `rgba(${r},${g},${b},${a})`;
}

interface Props {
  schema: SectionSchema;
  tables: ApiTable[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function SchemaView({ schema, tables, selectedId, onSelect }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const containerW = screenWidth - 32;
  const scale      = containerW / schema.width;
  const containerH = schema.height * scale;

  const tableMap: Record<string, ApiTable> = {};
  tables.forEach(t => { tableMap[t.id] = t; });

  return (
    <ScrollView
      style={{ maxHeight: containerH }}
      contentContainerStyle={{ height: containerH }}
      scrollEnabled={containerH > 500}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.canvas, { width: containerW, height: containerH }]}>

        {/* 1. Rectangles — стены, комнаты */}
        {schema.rectangleElements.map((el, i) => {
          const bg = toRgba(el.color);
          const isLarge = el.width >= schema.width * 0.8 && el.height >= schema.height * 0.8;
          return (
            <View
              key={`rect-${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: el.x * scale,
                top: el.y * scale,
                width: el.width * scale,
                height: el.height * scale,
                backgroundColor: isLarge ? 'transparent' : bg,
                borderWidth: isLarge ? 1.5 : 1,
                borderColor: isLarge ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)',
                borderRadius: 4,
                zIndex: el.z,
                transform: el.angle ? [{ rotate: `${el.angle}deg` }] : [],
              }}
            />
          );
        })}

        {/* 2. Ellipses */}
        {schema.ellipseElements.map((el, i) => (
          <View
            key={`ellipse-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: el.x * scale,
              top: el.y * scale,
              width: el.width * scale,
              height: el.height * scale,
              backgroundColor: toRgba(el.color, 'rgba(255,255,255,0.06)'),
              borderRadius: (Math.min(el.width, el.height) * scale) / 2,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              zIndex: el.z,
              transform: el.angle ? [{ rotate: `${el.angle}deg` }] : [],
            }}
          />
        ))}

        {/* 3. Tables */}
        {schema.tableElements.map((el) => {
          const table = tableMap[el.tableId];
          if (!table) return null;
          const isSel    = selectedId === el.tableId;
          const num      = table.number;
          const w        = Math.max(el.width * scale, 32);
          const h        = Math.max(el.height * scale, 32);
          const fontSize = Math.max(9, Math.min(16, w * 0.32));
          return (
            <TouchableOpacity
              key={el.tableId}
              activeOpacity={0.75}
              onPress={() => onSelect(isSel ? null : el.tableId)}
              style={{
                position: 'absolute',
                left: el.x * scale,
                top: el.y * scale,
                width: w,
                height: h,
                borderRadius: 8,
                backgroundColor: isSel ? GREEN : 'rgba(255,255,255,0.11)',
                borderWidth: isSel ? 0 : 1,
                borderColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50 + el.z,
                transform: el.angle ? [{ rotate: `${el.angle}deg` }] : [],
              }}
            >
              <Text style={{
                color: isSel ? '#fff' : 'rgba(255,255,255,0.8)',
                fontSize,
                fontWeight: '700',
                lineHeight: fontSize * 1.2,
              }}>
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* 4. Marks — текстовые метки */}
        {schema.markElements.map((el, i) => (
          <View
            key={`mark-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: el.x * scale,
              top: el.y * scale,
              width: el.width * scale,
              height: Math.max(el.height * scale, 14),
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 100 + el.z,
              transform: el.angle ? [{ rotate: `${el.angle}deg` }] : [],
            }}
          >
            <Text style={{
              color: toRgba(el.color, 'rgba(255,255,255,0.45)'),
              fontSize: Math.max(9, Math.min(13, el.height * scale * 0.7)),
              fontWeight: '600',
            }}>
              {el.text}
            </Text>
          </View>
        ))}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
