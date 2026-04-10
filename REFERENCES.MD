# REFERÊNCIAS

## CEP

O Código de Endereçamento Postal (CEP) foi criado em 1970 no Brasil e funciona como um sistema de coordenadas simplificado para facilitar a entrega de correspondências.

A estrutura do CEP é composta por oito dígitos e pode ser lida como níveis de detalhe geográfico:

- `1` — região postal (10 regiões)
- `3` — sub-região dentro da região
- `1` — setor dentro da sub-região
- `6` — subsetor dentro do setor
- `5` — divisão ainda mais específica
- `000` — sufixo de distribuição, que identifica ruas, avenidas, lotes ou unidades específicas

Exemplo:

`1 3 1 6 5 - 0 0 0`

### Observações

- Os primeiros cinco dígitos definem a área geográfica ampla e o setor.
- Os três últimos dígitos (sufixo) costumam identificar trechos de rua, quadras ou pequenos conjuntos.
- CEPs completos com sufixo `000` muitas vezes representam uma área ampla ou código base para uma localidade.

Link de referência:
- https://www.youtube.com/shorts/eszAQk2KkBI

## Fórmula de Haversine

A fórmula de Haversine calcula a menor distância entre dois pontos na superfície de uma esfera, usando latitude e longitude em radianos. É amplamente usada para medir distâncias em aplicações geográficas quando o terreno é aproximado como esférico.

A fórmula pode ser expressa assim:

```text
hav = sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)
d = 2 × r × atan2(√hav, √(1 − hav))
```

Onde:

- `d`: distância entre os dois pontos
- `r`: raio da Terra (aproximadamente 6371 km)
- `φ₁`, `φ₂`: latitudes dos pontos 1 e 2 em radianos
- `Δφ`: diferença entre as latitudes em radianos
- `Δλ`: diferença entre as longitudes em radianos

### Uso prático

- A distância resultante fica na mesma unidade usada para `r`.
- Para trabalhar em metros, use `r = 6371000`.
- Essa fórmula é adequada para cálculos de distância de curto a médio alcance em aplicações geográficas.

Link de referência:
- https://www.movable-type.co.uk/scripts/latlong.html

## Jittering em geocodificação

Jittering é uma técnica que adiciona pequenas variações aleatórias às coordenadas geográficas (latitude/longitude) para:

- proteger a privacidade de endereços exatos;
- evitar sobreposição de pontos em mapas e visualizações;
- melhorar a clareza de exibição em mapas de alta densidade.

### Quando usar

- ao mostrar dados de localização sensíveis em visualizações públicas;
- ao distribuir visualmente muitos pontos próximos para evitar aglomeração;
- quando a precisão exata não é necessária e a proteção de privacidade é importante.
