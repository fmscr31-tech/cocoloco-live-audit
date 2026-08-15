# Architecture Document: CocoLoco Live Manager

## 1. Visión general del sistema
[`CocoLoco Live Manager`](PROJECT_MEMORY.md:1) es una plataforma modular y desacoplada diseñada para la gestión en tiempo real de competiciones en transmisiones en vivo (optimizada inicialmente para formatos estilo TikTok LIVE). El sistema separa estrictamente la lógica de negocio y persistencia ([`src/core/`](src/core/gameEngine.js:1)), la interfaz de control ([`src/App.jsx`](src/App.jsx:1)) y la interfaz de visualización para la audiencia ([`src/components/overlay.jsx`](src/components/overlay.jsx:1)).

## 2. Flujo completo desde TikTok LIVE hasta el Overlay
1. **Captura de Eventos**: Un conector externo (ej. WebSocket o webhook de TikTok LIVE) recibe eventos de chat, regalos y likes.
2. **Puente de Eventos**: [`src/core/eventBridge.js`](src/core/eventBridge.js:1) normaliza las payloads entrantes hacia eventos internos del sistema.
3. **Gestor de Eventos y Estado**: [`src/core/eventManager.js`](src/core/eventManager.js:1) y [`src/core/stateManager.js`](src/core/stateManager.js:1) procesan los eventos, actualizan los puntajes y disparan notificaciones reactivas.
4. **Motor de Juego**: [`src/core/gameEngine.js`](src/core/gameEngine.js:1) coordina las reglas de negocio (puntos, temporizadores, rondas).
5. **Persistencia**: [`src/core/storageManager.js`](src/core/storageManager.js:1) sincroniza el estado con [`localStorage`](PROJECT_MEMORY.md:11).
6. **Overlay en Vivo**: [`src/components/overlay.jsx`](src/components/overlay.jsx:1) se suscribe a los cambios mediante [`src/core/stateManager.js`](src/core/stateManager.js:1) y renderiza las animaciones, marcadores y efectos en tiempo real.

## 3. Responsabilidad de cada carpeta
- [`src/core/`](src/core/gameEngine.js:1): Contiene toda la lógica de negocio pura, administradores de estado, temporizadores y persistencia, independientes de React.
- [`src/components/`](src/components/overlay.jsx:1): Componentes de interfaz de usuario reutilizables (paneles, HUDs, tarjetas de batalla).
- [`src/pages/`](src/pages/OverlayPage.jsx:1): Vistas principales de la aplicación (Panel de Administración y Vista de Overlay).
- [`src/assets/`](src/assets/hero.png): Recursos estáticos globales (imágenes, iconos, estilos globales).

## 4. Responsabilidad de cada módulo existente
- [`src/core/gameEngine.js`](src/core/gameEngine.js:1): Coordinador central de todos los módulos de lógica y ciclo de vida de la partida.
- [`src/core/stateManager.js`](src/core/stateManager.js:1): Sistema Pub/Sub global para la sincronización reactiva de estados entre lógica y UI.
- [`src/core/eventManager.js`](src/core/eventManager.js:1): Despachador de eventos del sistema (regalos, penalizaciones, cambios de ronda).
- [`src/core/eventBridge.js`](src/core/eventBridge.js:1): Adaptador para traducir eventos externos en comandos del motor de juego.
- [`src/core/battlemanager.js`](src/core/battlemanager.js:1): Control de emparejamientos, estados de batalla (activo, pausado, finalizado).
- [`src/core/competitionManager.js`](src/core/competitionManager.js:1): Contenedor maestro del estado de la competición y reglas generales.
- [`src/core/playerManager.js`](src/core/playerManager.js:1): Administración de participantes, asignación a equipos y cálculo de puntos individuales.
- [`src/core/TeamManager.js`](src/core/TeamManager.js:1): Gestión de equipos, escudos y puntuaciones acumuladas.
- [`src/core/roundManager.js`](src/core/roundManager.js:1): Control secuencial de rondas dentro de una batalla.
- [`src/core/timerManager.js`](src/core/timerManager.js:1): Manejo de temporizadores de cuenta regresiva y eventos basados en tiempo.
- [`src/core/storageManager.js`](src/core/storageManager.js:1): Interfaz segura para la lectura y escritura en [`localStorage`](PROJECT_MEMORY.md:11).

## 5. Dependencias permitidas y dependencias prohibidas
- **Permitidas**:
  - Los componentes UI ([`src/components/`](src/components/overlay.jsx:1), [`src/pages/`](src/pages/OverlayPage.jsx:1)) pueden importar [`src/core/stateManager.js`](src/core/stateManager.js:1) y [`src/core/gameEngine.js`](src/core/gameEngine.js:1).
  - Los módulos de [`src/core/`](src/core/gameEngine.js:1) pueden comunicarse entre sí mediante interfaces bien definidas o [`src/core/stateManager.js`](src/core/stateManager.js:1).
- **Prohibidas**:
  - Los módulos de [`src/core/`](src/core/gameEngine.js:1) **NUNCA** deben importar dependencias de React ni componentes de UI.
  - Dependencias circulares directas entre administradores de [`src/core/`](src/core/gameEngine.js:1).

## 6. Convenciones para nombrar archivos, funciones y eventos
- **Archivos**: camelCase para submódulos y managers (ej. [`playerManager.js`](src/core/playerManager.js:1)), PascalCase para componentes React (ej. [`BattlePanel.jsx`](src/components/BattlePanel.jsx:1)).
- **Funciones**: camelCase descriptivo con verbos de acción (ej. `addPlayer()`, `calculateScore()`).
- **Eventos**: SCREAMING_SNAKE_CASE para tipos de eventos (ej. `BATTLE_STARTED`, `PLAYER_GIFT_RECEIVED`).

## 7. Estrategia para agregar nuevos juegos sin modificar el motor principal
Se implementará un patrón de estrategia (Plugin/Ruleset) mediante un `gameModeManager` modular. Cada modo de juego define su propia estructura de puntos y condiciones de victoria sin tocar la lógica base de [`src/core/gameEngine.js`](src/core/gameEngine.js:1).

## 8. Estrategia para soportar múltiples plataformas de streaming en el futuro
Se utilizará una arquitectura basada en adaptadores (Adapters). [`src/core/eventBridge.js`](src/core/eventBridge.js:1) actuará como capa de abstracción, permitiendo conectar adaptadores específicos para TikTok, Twitch, YouTube o Kick que traduzcan sus eventos al formato unificado del motor.

## 9. Plan de evolución por fases (Roadmap técnico)
- **Fase 1**: Consolidación de la capa de competición y estado ([[`src/core/competitionManager.js`](src/core/competitionManager.js:1)]).
- **Fase 2**: Implementación del sistema de modos de juego desacoplados.
- **Fase 3**: Modularización y refactorización del panel de administración ([[`src/App.jsx`](src/App.jsx:1)]).
- **Fase 4**: Conectores avanzados para múltiples plataformas de streaming.

## 10. Identificar deuda técnica encontrada
- Dependencia de polling (`setInterval`) en algunos componentes en lugar de suscripción reactiva completa.
- Monolitismo parcial en [`src/App.jsx`](src/App.jsx:1).
- Manejo disperso de efectos visuales sin un bus centralizado de eventos UI.

## 11. Proponer mejoras priorizadas por impacto y riesgo
1. **Migración a suscripción reactiva pura** (Impacto: Alto, Riesgo: Bajo).
2. **Modularización del Panel de Administración** (Impacto: Alto, Riesgo: Medio).
3. **Estandarización del Bus de Eventos** (Impacto: Medio, Riesgo: Bajo).
