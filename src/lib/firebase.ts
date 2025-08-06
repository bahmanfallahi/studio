// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { users, products, coupons } from '@/lib/data';

// Your web app's Firebase configuration
const firebaseConfig = { 
    apiKey: "AIzaSyC1-YxpYHgJbTp2OGd1cLesvIk4Kc_8bL4", 
    authDomain: "fiberflex-coupons.firebaseapp.com", 
    projectId: "fiberflex-coupons", 
    storageBucket: "fiberflex-coupons.appspot.com", 
    messagingSenderId: "822507312207", 
    appId: "1:822507312207:web:77a1348c8df958bab1863a"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Seeding function
export async function seedDatabase() {
  try {
    // Check if data already exists to prevent re-seeding
    const productsSnapshot = await getDocs(collection(db, "products"));
    if (!productsSnapshot.empty) {
      console.log("Database already seeded.");
      return { success: true, message: "Database has already been seeded." };
    }

    const batch = writeBatch(db);

    // Seed users
    users.forEach((user) => {
      const docRef = doc(db, "users", user.id.toString());
      batch.set(docRef, user);
    });

    // Seed products
    products.forEach((product) => {
      const docRef = doc(db, "products", product.id.toString());
      batch.set(docRef, product);
    });

    // Seed coupons
    coupons.forEach((coupon) => {
      const docRef = doc(db, "coupons", coupon.id.toString());
      batch.set(docRef, coupon);
    });

    await batch.commit();
    console.log("Database seeded successfully!");
    return { success: true, message: "Database seeded successfully!" };
  } catch (error) {
    console.error("Error seeding database:", error);
    return { success: false, message: (error as Error).message };
  }
}


export { app, db };