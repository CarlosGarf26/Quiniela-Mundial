# 🏆 Quiniela Mundial 2026

Una plataforma moderna e interactiva para pronosticar los resultados de la Copa del Mundo 2026. Diseñada con un enfoque "Sleek" oscuro, permite a los fanáticos del fútbol competir por el primer lugar en una tabla de posiciones global en tiempo real.

## ✨ Características Principales

- **Autenticación Segura:** Registro e inicio de sesión de usuarios gestionado por Firebase Auth.
- **Predicciones Dinámicas:** Los usuarios pueden ingresar y modificar sus pronósticos antes de que comiencen los partidos.
- **Tabla de Clasificación (Leaderboard):** Ranking automatizado en tiempo real que calcula y asigna puntos basándose en los aciertos (resultado exacto o ganador).
- **Panel de Administración:** Interfaz protegida para administradores que permite crear partidos, actualizar marcadores finales y desencadenar el cálculo de puntos para todos los usuarios.
- **Interfaz Sleek & Dark:** UI futurista y elegante construida sobre Tailwind CSS, optimizada para todas las pantallas.
- **Preparado para Notificaciones:** Configurado para integrarse con Firebase Cloud Messaging (FCM) para recibir alertas de goles o inicio de partidos.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 19, Vite, Tailwind CSS v4
- **Backend/Database:** Firebase (Firestore)
- **Authentication:** Firebase Auth
- **Routing:** React Router v7
- **Despliegue Recomendado:** Vercel

## 🚀 Despliegue Rápido en Vercel

Este proyecto está optimizado para funcionar directamente en **Vercel** como una Single Page Application (SPA).

1. Haz **Fork** o clona este repositorio en tu cuenta de GitHub.
2. Inicia sesión en [Vercel](https://vercel.com/) y haz clic en **Add New Project**.
3. Importa tu repositorio de GitHub.
4. Vercel detectará automáticamente que es un proyecto **Vite**.
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Haz clic en **Deploy**. 
*(Nota: El archivo `vercel.json` ya está incluido para manejar las rutas internas correctamente sin dar error 404).*

## ⚙️ Configuración de Firebase

La configuración del proyecto utiliza un archivo `firebase-applet-config.json` (o equivalente en entorno). Como los datos de conexión de Firebase en aplicaciones cliente son públicos por diseño, asegúrate de que el archivo expuesto apunte a tu base de datos correcta. Todo ruteo de seguridad está protegido por Reglas de Firestore (`firestore.rules`).
