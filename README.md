SnapSplit 🧾
============

SnapSplit is a real-time, collaborative bill-splitting web application designed to make sharing expenses painless. It leverages Google's Gemini AI to automatically scan and parse digital receipts, smart tax calculation algorithms, and Firebase for instant synchronization across devices.

*(Replace this link with a screenshot of your actual app once uploaded)*

✨ Key Features
--------------

-   **🤖 AI Receipt Scanning:** Uses **Google Gemini 2.0 & 1.5 Flash** to analyze receipts, extracting items, prices, and quantities automatically. Optimized for digital receipts (Walmart, Instacart, etc.).

-   **⚡ Real-Time Collaboration:** Built on **Firebase Firestore**, allowing multiple users to join a room and see updates (claims, price changes) instantly without refreshing.

-   **📱 PWA / Installable:** Fully responsive design that can be installed on mobile devices (Android/iOS) as a native-like app.

-   **🧠 Smart Tax Logic:**

    -   **Smart Mode:** Distributes tax only to taxable items (e.g., distinguishing between essential groceries and taxable goods).

    -   **Proportional Mode:** Splits tax based on the subtotal amount per person.

    -   **By Item:** Splits tax based on the number of items claimed.

-   **🔗 Easy Sharing:** Share a simple 6-character room code to invite friends.

-   **💰 Penny-Perfect Math:** Advanced rounding logic ensures the sum of individual splits matches the total bill exactly, distributing remainder cents fairly.

🛠️ Tech Stack
--------------

-   **Frontend:** [React.js](https://reactjs.org/ "null")

-   **Styling:** [Tailwind CSS](https://tailwindcss.com/ "null")

-   **Backend & Auth:** [Firebase](https://firebase.google.com/ "null") (Firestore, Anonymous Auth)

-   **AI/ML:** [Google Gemini API](https://ai.google.dev/ "null") (Multimodal Vision)

-   **Icons:** [Lucide React](https://lucide.dev/ "null")

-   **Runtime:** [Node.js](https://nodejs.org/ "null")

-   **Deployment:** [Vercel](https://vercel.com/ "null")

🚀 Getting Started
------------------

Follow these instructions to set up the project locally.

### Prerequisites

-   Node.js (v14 or higher)

-   npm or yarn

-   A Firebase Project

-   A Google Gemini API Key

### Installation

1.  **Clone the repository**

    ```
    git clone [https://github.com/yourusername/snapsplit.git](https://github.com/yourusername/snapsplit.git)
    cd snapsplit

    ```

2.  **Install dependencies**

    ```
    npm install

    ```

3.  **Configure Firebase & API Keys**

    -   Create a `.env` file in the root directory.

    -   Add your Gemini API Key:

        ```
        REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here

        ```

    -   Open `src/App.js` and update the `firebaseConfig` object with your own Firebase project credentials:

        ```
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "your-app.firebaseapp.com",
          projectId: "your-project-id",
          // ... rest of config
        };

        ```

4.  **Run the application**

    ```
    npm start

    ```

    The app will open at `http://localhost:3000`.

🌐 Deployment
-------------

This project is optimized for deployment on **Vercel**.

1.  Push your code to GitHub.

2.  Import the project into Vercel.

3.  Add the Environment Variable in Vercel Settings:

    -   **Key:** `REACT_APP_GEMINI_API_KEY`

    -   **Value:** `Your_Actual_Gemini_Key`

4.  Deploy! 🚀

🧪 How It Works
---------------

1.  **Create a Room:** Enter your name to start a session. You'll get a Room Code.

2.  **Scan Receipt:** Upload a screenshot or photo of a bill. The AI will parse it.

3.  **Invite Friends:** Share the code. Friends join and tap items to claim them.

4.  **Settle Up:** View the "Breakdown" tab to see exactly what everyone owes, including their fair share of tax and discounts.

📄 License
----------

This project is licensed under the MIT License - see the [LICENSE](https://www.google.com/search?q=LICENSE "null") file for details.
