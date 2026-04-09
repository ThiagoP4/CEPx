# CEP

## Como o CEP é criado

Criado em 1970, o código de endereçamento postal é um sistema de coordenadas disfarçado, onde cada digíto representa um "zoom" no mapa, 

1 3 1 6 5 - 0 0 0

O primeiro número represetna uma de 10 regiões postais
O segundo, é resultado de uma subdivisão em mais 10 subregiões
Já o terceiro, é uma divisão em mais 10 setores
O quarto, uma divisão em 10 subsetores

Os três dígitos depois do hífen são chamados de sufixo de distribuição, usado para identificar ruas e outras unidades mais específicas 

Link : https://www.youtube.com/shorts/eszAQk2KkBI

## Fórmula de Haversine
A fórmula de Haversine calcula a menor distância (distância ortodrômica) entre dois pontos na superfície de uma esfera (como a Terra) usando latitude e longitude. Ela é o padrão na ciência da computação para calcular a distância em "linha reta" (a menor distância possível, chamada de distância ortodrômica)

A fórmula é definida por:

![alt text](image.png)

Onde:

d: Distância entre os dois pontos (na mesma unidade do raio)
r: Raio da Terra (média: 6371 km)
φ: Latitude do ponto 1 e latitude do ponto 2 em radianos.
Δφ: Diferença de latitude
Δλ: Diferença de longitude

Link: https://www.movable-type.co.uk/scripts/latlong.html