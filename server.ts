import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "nexus-learn-secret-key-2026";

// Cloudinary configuration
const cloudinaryCloudName =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.cloud_name || "";
const cloudinaryApiKey =
  process.env.CLOUDINARY_API_KEY || process.env.api_key || "";
const cloudinaryApiSecret =
  process.env.CLOUDINARY_API_SECRET || process.env.api_secret || "";

const cleanValue = (val: string) => val.replace(/[,]$/, "").trim();

cloudinary.config({
  cloud_name: cleanValue(cloudinaryCloudName),
  api_key: cleanValue(cloudinaryApiKey),
  api_secret: cleanValue(cloudinaryApiSecret),
});

if (!process.env.CLOUDINARY_CLOUD_NAME && !process.env.cloud_name) {
  console.warn(
    "Cloudinary credentials NOT found in environment variables."
  );
}

// Load Firebase config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  console.log(
    "Firebase config loaded:",
    JSON.stringify({ ...firebaseConfig, apiKey: "REDACTED" })
  );
} catch (e: any) {
  console.error("Error loading firebase-applet-config.json:", e.message);
}

// Force project ID
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
  process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
  process.env.FIRESTORE_PROJECT_ID = firebaseConfig.projectId;
  console.log(
    `Forcing project ID environment variables to: ${firebaseConfig.projectId}`
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Firebase globals
let db: any = null;
let auth: any = null;
let storageBucket: any = null;
let firebaseApp: admin.app.App | null = null;
let lastDbError: any = null;

// Read service account JSON from Render env
const getServiceAccountFromEnv = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch (error: any) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", error.message);
    return null;
  }
};

// Initialize Firebase app
const getFirebaseApp = async () => {
  if (firebaseApp) return firebaseApp;

  try {
    if (admin.apps.length > 0) {
      console.log(`Clearing ${admin.apps.length} existing Firebase apps...`);
      await Promise.all(admin.apps.map((a) => a?.delete()));
    }

    const serviceAccountFromEnv = getServiceAccountFromEnv();

    if (serviceAccountFromEnv) {
      console.log(
        "Initializing Firebase Admin using FIREBASE_SERVICE_ACCOUNT env var..."
      );
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccountFromEnv as admin.ServiceAccount
        ),
        projectId: firebaseConfig.projectId || serviceAccountFromEnv.project_id,
      });
    } else if (
      process.env.GOOGLE_APPLICATION_CREDENTIALS &&
      fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    ) {
      console.log(
        "Initializing Firebase Admin using local serviceAccountKey.json file..."
      );
      const serviceAccount = JSON.parse(
        fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8")
      );

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as admin.ServiceAccount
        ),
        projectId: firebaseConfig.projectId || serviceAccount.project_id,
      });
    } else {
      console.log("Initializing Firebase Admin with projectId only...");
      firebaseApp = admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }

    console.log(
      `Firebase Admin initialized with project: ${firebaseApp.options.projectId}`
    );
    console.log(
      "App Options:",
      JSON.stringify({ ...firebaseApp.options, credential: "REDACTED" })
    );

    return firebaseApp;
  } catch (e: any) {
    console.error("Firebase Admin initialization failed:", e.message);
    lastDbError = `Init failed: ${e.message}`;
    return null;
  }
};

const testDb = async (dbInstance: any, label: string) => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout connecting to Firestore")), 5000)
    );

    const fetchPromise = dbInstance.collection("courses").limit(1).get();
    const snap = (await Promise.race([fetchPromise, timeoutPromise])) as any;

    console.log(
      `Firestore connection (${label}) verified. Project: ${dbInstance.projectId}, Database: ${dbInstance.databaseId}. Found ${snap.size} docs.`
    );
    return true;
  } catch (error: any) {
    const errorMsg = `Firestore connection (${label}) failed (Project: ${dbInstance?.projectId}, Database: ${dbInstance?.databaseId}): ${error.message}`;
    console.error(errorMsg);
    if (error.code) console.error(`Error code: ${error.code}`);
    lastDbError = errorMsg;
    return false;
  }
};

const initializeDb = async () => {
  const dbId = firebaseConfig.firestoreDatabaseId;
  const projectId = firebaseConfig.projectId;

  if (!projectId) {
    console.error("No project ID found in firebase-applet-config.json");
    return null;
  }

  console.log(
    `Initializing Firestore. Target Project: ${projectId}, Target Database: ${dbId}`
  );

  firebaseApp = await getFirebaseApp();
  if (!firebaseApp) {
    lastDbError =
      "getFirebaseApp() returned null. Check service account credentials and project ID.";
    return null;
  }

  auth = getAuth(firebaseApp);

  const bucketName =
    firebaseConfig.storageBucket || `${firebaseConfig.projectId}.appspot.com`;
  console.log(`Initializing Storage Bucket: ${bucketName}`);
  storageBucket = getStorage(firebaseApp).bucket(bucketName);

  try {
    const [exists] = await storageBucket.exists();
    if (!exists) {
      console.warn(
        `Storage bucket ${bucketName} does not exist. Uploads will use Cloudinary/fallbacks.`
      );
    } else {
      console.log(`Storage bucket ${bucketName} verified and accessible.`);
    }
  } catch (e: any) {
    console.warn(
      `Could not verify storage bucket ${bucketName}: ${e.message}. This is normal if Storage is not yet enabled.`
    );
  }

  if (dbId && dbId !== "(default)") {
    try {
      console.log(`Attempting named database: ${dbId}`);
      const namedDb = getFirestore(firebaseApp, dbId);
      if (await testDb(namedDb, `named: ${dbId}`)) {
        return namedDb;
      }
    } catch (e: any) {
      console.error(`Error initializing named database ${dbId}:`, e.message);
    }
  }

  try {
    console.log("Attempting default database");
    const defaultDb = getFirestore(firebaseApp);
    if (await testDb(defaultDb, "default")) {
      return defaultDb;
    }
  } catch (e: any) {
    console.error("Error initializing default database:", e.message);
  }

  lastDbError = `All Firestore initialization attempts failed. Last error: ${lastDbError || "Unknown"
    }`;
  console.warn(lastDbError);
  return null;
};

async function uploadToStorage(
  file: Express.Multer.File,
  folder: string
): Promise<string> {
  try {
    return await new Promise((resolve) => {
      const isPdf =
        file.mimetype === "application/pdf" ||
        (file.originalname &&
          file.originalname.toLowerCase().endsWith(".pdf"));

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isPdf ? "raw" : "image",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            resolve(
              isPdf
                ? ""
                : `https://picsum.photos/seed/${folder}-${Date.now()}/800/600`
            );
          } else {
            resolve(result?.secure_url || "");
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  } catch (err: any) {
    console.error("Error in uploadToStorage:", err);
    const isPdf =
      file.mimetype === "application/pdf" ||
      (file.originalname &&
        file.originalname.toLowerCase().endsWith(".pdf"));
    return isPdf
      ? ""
      : `https://picsum.photos/seed/${folder}-${Date.now()}/800/600`;
  }
}

async function seedAdmin() {
  if (!db || !auth) {
    console.error("Cannot seed admin: db or auth is null");
    return;
  }

  const adminEmail = "saikrishnagummadidala34@gmail.com";
  const adminPassword = "password123";

  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(adminEmail);
      console.log("Admin user already exists");
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        userRecord = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: "System Admin",
        });
        console.log("Admin user created");
      } else {
        throw error;
      }
    }

    const userDoc = await db.collection("users").doc(userRecord.uid).get();
    if (!userDoc.exists) {
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: adminEmail,
        displayName: "System Admin",
        role: "admin",
        photoURL:
          "https://ui-avatars.com/api/?name=Admin&background=4f46e5&color=fff",
        createdAt: new Date().toISOString(),
      });
      console.log("Admin profile seeded in Firestore");
    }
  } catch (error) {
    console.error("Error seeding admin:", error);
  }
}

async function seedCourses() {
  console.log("seedCourses function called");
  if (!db) {
    console.error("Cannot seed courses: db is null");
    return;
  }

  const defaultCourses = [
    {
      title: "Java Script",
      description:
        "Master the fundamentals of JavaScript, the language of the web. From basics to advanced asynchronous patterns.",
      instructor: "Krishna",
      duration: "12h 30m",
      level: "Intermediate",
      category: "Programming",
      price: 0,
      rating: 5,
      thumbnailUrl: "https://picsum.photos/seed/js-nexus/800/500",
      pdfUrl: "",
      published: true,
      createdAt: new Date().toISOString(),
      enrollmentCount: 0,
    },
    {
      title: "Python for Data Science",
      description:
        "Learn Python from scratch and apply it to real-world data science problems. Includes NumPy, Pandas, and Scikit-Learn.",
      instructor: "sai",
      duration: "15h 45m",
      level: "Intermediate",
      category: "Data Science",
      price: 0,
      rating: 5,
      thumbnailUrl: "https://picsum.photos/seed/python-nexus/800/500",
      pdfUrl: "",
      published: true,
      createdAt: new Date().toISOString(),
      enrollmentCount: 0,
    },
    {
      title: "Full-Stack Web Development",
      description:
        "A comprehensive guide to building modern web applications from front-end to back-end.",
      instructor: "Prof. James Wilson",
      duration: "24h 45m",
      level: "Intermediate",
      category: "Web Development",
      price: 0,
      rating: 4.8,
      thumbnailUrl: "https://picsum.photos/seed/fullstack-nexus/800/500",
      pdfUrl: "",
      published: true,
      createdAt: new Date().toISOString(),
      enrollmentCount: 0,
    },
    {
      title: "Java Programming",
      description:
        "Deep dive into Java programming, from object-oriented principles to advanced concurrency.",
      instructor: "Dr. Marcus Thorne",
      duration: "20h 15m",
      level: "Beginner",
      category: "Programming",
      price: 0,
      rating: 4.9,
      thumbnailUrl: "https://picsum.photos/seed/java-nexus/800/500",
      pdfUrl: "",
      published: true,
      createdAt: new Date().toISOString(),
      enrollmentCount: 0,
    },
  ];

  try {
    console.log("Checking courses collection...");
    for (const course of defaultCourses) {
      console.log(`Checking if course exists: ${course.title}`);
      const q = await db
        .collection("courses")
        .where("title", "==", course.title)
        .get();
      if (q.empty) {
        console.log(`Seeding course: ${course.title}`);
        await db.collection("courses").add(course);
      } else {
        console.log(
          `Course already exists: ${course.title}, updating all fields...`
        );
        const docId = q.docs[0].id;
        await db.collection("courses").doc(docId).update({
          ...course,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    console.log("Default courses check/seed completed successfully");
  } catch (error) {
    console.error("Error seeding courses:", error);
  }
}

function getCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;

    let publicIdWithExt = "";
    if (
      parts[uploadIndex + 1].startsWith("v") &&
      !isNaN(Number(parts[uploadIndex + 1].substring(1)))
    ) {
      publicIdWithExt = parts.slice(uploadIndex + 2).join("/");
    } else {
      publicIdWithExt = parts.slice(uploadIndex + 1).join("/");
    }

    return publicIdWithExt.split(".")[0];
  } catch (e) {
    console.error("Error extracting Cloudinary public_id:", e);
    return null;
  }
}

async function startServer() {
  console.log("Starting NexusLearn server...");

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use("/uploads", express.static("uploads"));

  db = await initializeDb();
  if (!db) {
    console.error(
      "CRITICAL: Failed to initialize Firebase on startup. Check firebase-applet-config.json and project settings."
    );
  }

  (async () => {
    try {
      if (db) {
        console.log("Starting background seeding...");
        await seedAdmin();
        console.log("seedAdmin completed");
        await seedCourses();
        console.log("seedCourses completed");
      } else {
        console.warn("Skipping seeding because Firestore is not initialized");
      }
    } catch (err) {
      console.error("Error during background seeding:", err);
    }
  })();

  app.get("/api/files/*", async (req, res) => {
    try {
      if (!storageBucket) {
        return res.status(500).send("Storage bucket not initialized");
      }

      const filePath = req.params[0];
      const file = storageBucket.file(filePath);
      const [exists] = await file.exists();

      if (!exists) {
        return res.status(404).send("File not found");
      }

      const [metadata] = await file.getMetadata();
      const isPdf = filePath.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      } else {
        res.setHeader(
          "Content-Type",
          metadata.contentType || "application/octet-stream"
        );
      }
      res.setHeader("Cache-Control", "public, max-age=3600");

      file.createReadStream().pipe(res);
    } catch (error: any) {
      console.error(`Error serving file ${req.params[0]}:`, error);
      res.status(500).send(`Error serving file: ${error.message}`);
    }
  });

  // Repair media links for all courses
  app.post("/api/admin/repair-media", async (req, res) => {
    const currentDb = await getDbInstance();
    if (!currentDb) return res.status(500).json({ error: "DB not ready" });

    try {
      const snap = await currentDb.collection("courses").get();
      const updates = [];
      const appUrl = process.env.APP_URL || "";

      for (const doc of snap.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const updateData: any = {};

        // Fix thumbnailUrl
        if (
          !data.thumbnailUrl ||
          data.thumbnailUrl.includes("storage.googleapis.com") ||
          data.thumbnailUrl.startsWith("/api/files/")
        ) {
          if (
            data.thumbnailUrl &&
            (data.thumbnailUrl.includes("storage.googleapis.com") ||
              data.thumbnailUrl.startsWith("/api/files/"))
          ) {
            let fileName = "";
            if (data.thumbnailUrl.includes("storage.googleapis.com")) {
              const parts = data.thumbnailUrl.split("/");
              fileName = parts
                .slice(parts.indexOf(storageBucket?.name || "") + 1)
                .join("/");
            } else {
              fileName = data.thumbnailUrl.replace("/api/files/", "");
            }
            if (fileName && storageBucket) {
              updateData.thumbnailUrl = `${appUrl}/api/files/${fileName}`;
              needsUpdate = true;
            } else {
              updateData.thumbnailUrl = `https://picsum.photos/seed/${doc.id}/800/600`;
              needsUpdate = true;
            }
          } else if (!data.thumbnailUrl) {
            updateData.thumbnailUrl = `https://picsum.photos/seed/${doc.id}/800/600`;
            needsUpdate = true;
          }
        }

        // Fix pdfUrl (supporting both local fixes and Cloudinary fallbacks)
        if (
          !data.pdfUrl ||
          data.pdfUrl.includes("storage.googleapis.com") ||
          data.pdfUrl.startsWith("/api/files/") ||
          data.pdfUrl.includes("w3.org")
        ) {
          if (
            data.pdfUrl &&
            (data.pdfUrl.includes("storage.googleapis.com") ||
              data.pdfUrl.startsWith("/api/files/") ||
              data.pdfUrl.includes("w3.org"))
          ) {
            let fileName = "";
            if (data.pdfUrl.includes("storage.googleapis.com")) {
              const parts = data.pdfUrl.split("/");
              fileName = parts
                .slice(parts.indexOf(storageBucket?.name || "") + 1)
                .join("/");
            } else {
              fileName = data.pdfUrl.replace("/api/files/", "");
            }
            if (fileName && storageBucket) {
              updateData.pdfUrl = `${appUrl}/api/files/${fileName}`;
              needsUpdate = true;
            } else {
              updateData.pdfUrl = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";
              needsUpdate = true;
            }
          } else if (!data.pdfUrl) {
            updateData.pdfUrl = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          updates.push(doc.ref.update(updateData));
        }
      }

      await Promise.all(updates);
      res.json({ success: true, updatedCount: updates.length });
    } catch (error: any) {
      console.error("Error repairing media links:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "NexusLearn API is running",
      firebase: db ? "initialized" : "not initialized",
      projectId: firebaseConfig.projectId,
      databaseId: db ? db.databaseId : firebaseConfig.firestoreDatabaseId,
      lastError: lastDbError,
    });
  });

  // JWT Middleware
  const authMiddleware = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    const { uid, email, displayName } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: "Missing user data" });
    }

    const currentDb = await getDbInstance();
    if (!currentDb) return res.status(500).json({ error: "DB not ready" });

    try {
      const userRef = currentDb.collection("users").doc(uid);
      const userDoc = await userRef.get();

      let userData;

      if (!userDoc.exists) {
        // ✅ CREATE USER if not exists
        userData = {
          uid,
          email,
          displayName: displayName || "User",
          role: "student",
          photoURL: "",
          createdAt: new Date().toISOString(),
          skillPoints: 0
        };

        await userRef.set(userData);
      } else {
        userData = userDoc.data();
      }

      // ✅ SIGN TOKEN
      const token = jwt.sign(
        { uid: userData.uid, email: userData.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/profile", authMiddleware, async (req: any, res) => {
    const currentDb = await getDbInstance();
    if (!currentDb) return res.status(500).json({ error: "DB not ready" });

    try {
      const { uid } = req.user;

      const userDoc = await currentDb.collection("users").doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: "Profile Not Found" });
      }

      res.json(userDoc.data());

    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  const getDbInstance = async () => {
    if (!db) {
      console.log("Global db variable is null. Attempting re-initialization...");
      try {
        db = await initializeDb();
      } catch (e: any) {
        lastDbError = `Re-initialization failed: ${e.message}`;
        console.error(lastDbError);
        return null;
      }
    }

    if (!db) {
      lastDbError = "Database initialization returned null. Check server logs.";
      return null;
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout connecting to Firestore")), 5000)
      );
      const fetchPromise = db.collection("courses").limit(1).get();
      await Promise.race([fetchPromise, timeoutPromise]);
      return db;
    } catch (error: any) {
      const errorMsg = `Firestore connection error (Project: ${db.projectId}, Database: ${db.databaseId}): ${error.message}`;
      console.error(errorMsg);
      lastDbError = { message: errorMsg, code: error.code };

      if (error.code === 5) {
        if (db.databaseId !== "(default)") {
          console.warn("Attempting fallback to default database...");
          try {
            const defaultDb = getFirestore(firebaseApp!);
            await defaultDb.collection("courses").limit(1).get();
            db = defaultDb;
            console.log("Successfully fell back to default database.");
            return db;
          } catch (fallbackError: any) {
            const fallbackMsg = `Fallback to default database failed: ${fallbackError.message}`;
            console.error(fallbackMsg);
            lastDbError = `Fallback failed: ${fallbackError.message}`;
          }
        }
      }
      return null;
    }
  };

  app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello from server" });
  });

  app.get("/api/courses", async (req, res) => {
    const currentDb = await getDbInstance();
    if (!currentDb) return res.status(500).json({ error: "DB not ready" });

    try {
      const snap = await currentDb.collection("courses").get();
      const courses = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ error: error.message, lastError: lastDbError });
    }
  });

  app.post(
    "/api/courses",
    upload.fields([
      { name: "pdf", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    async (req, res) => {
      const currentDb = await getDbInstance();
      if (!currentDb) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }

      try {
        const {
          title,
          description,
          content,
          instructor,
          level,
          instructorId,
          topics,
          overallQuiz,
        } = req.body;

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const pdfFile = files["pdf"]?.[0];
        const thumbnailFile = files["thumbnail"]?.[0];

        let pdfUrl = "";
        let thumbnailUrl = `https://picsum.photos/seed/${title
          .replace(/\s+/g, "")
          .toLowerCase()}/800/600`;

        if (pdfFile) {
          pdfUrl = await uploadToStorage(pdfFile, "courses/pdfs");
        }

        if (thumbnailFile) {
          thumbnailUrl = await uploadToStorage(
            thumbnailFile,
            "courses/thumbnails"
          );
        }

        const parseJson = (val: any, fallback: any) => {
          if (!val || val === "undefined" || val === "null") return fallback;
          try {
            return typeof val === "string" ? JSON.parse(val) : val;
          } catch {
            return fallback;
          }
        };

        const courseData = {
          title,
          description,
          instructor: instructor || "System",
          instructorId: instructorId || null,
          level: level || "Beginner",
          content: content || "",
          pdfUrl,
          thumbnailUrl,
          published: false,
          createdAt: new Date().toISOString(),
          enrollmentCount: 0,
          topics: parseJson(topics, []),
          overallQuiz: parseJson(overallQuiz, null),
        };

        const docRef = await currentDb.collection("courses").add(courseData);
        res.json({ courseId: docRef.id, ...courseData });
      } catch (error: any) {
        console.error("Error creating course:", error);
        res.status(500).json({
          error: error.message || "Internal server error",
          details: error.message,
          code: error.code,
          stack:
            process.env.NODE_ENV === "production" ? undefined : error.stack,
        });
      }
    }
  );

  app.delete("/api/courses/:id", async (req, res) => {
    const currentDb = await getDbInstance();
    if (!currentDb) return res.status(500).json({ error: "Firebase not initialized" });

    try {
      const { id } = req.params;
      const doc = await currentDb.collection("courses").doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Course not found" });
      }

      const data = doc.data();

      if (data?.pdfUrl && data.pdfUrl.includes("cloudinary.com")) {
        const publicId = getCloudinaryPublicId(data.pdfUrl);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, {
              resource_type: "raw",
            });
          } catch (e) {
            console.warn("Failed to delete PDF from Cloudinary:", e);
          }
        }
      }

      if (data?.thumbnailUrl && data.thumbnailUrl.includes("cloudinary.com")) {
        const publicId = getCloudinaryPublicId(data.thumbnailUrl);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (e) {
            console.warn("Failed to delete thumbnail from Cloudinary:", e);
          }
        }
      }

      await currentDb.collection("courses").doc(id).delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting course:", error);
      res.status(500).json({
        error: error.message || "Internal server error",
        details: error.message,
        code: error.code,
        stack:
          process.env.NODE_ENV === "production" ? undefined : error.stack,
      });
    }
  });

  app.patch("/api/courses/:id", async (req, res) => {
    const currentDb = await getDbInstance();
    if (!currentDb) return res.status(500).json({ error: "Firebase not initialized" });

    try {
      const { id } = req.params;
      const { published } = req.body;
      await currentDb.collection("courses").doc(id).update({ published });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating course:", error);
      res.status(500).json({
        error: error.message || "Internal server error",
        details: error.message,
        code: error.code,
        stack:
          process.env.NODE_ENV === "production" ? undefined : error.stack,
      });
    }
  });

  app.put(
    "/api/courses/:id",
    upload.fields([
      { name: "pdf", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    async (req, res) => {
      const currentDb = await getDbInstance();
      if (!currentDb) {
        return res.status(500).json({
          error: "Firebase not initialized",
          lastError: lastDbError,
        });
      }

      try {
        const { id } = req.params;
        const {
          title,
          description,
          content,
          instructor,
          level,
          instructorId,
          topics,
          overallQuiz,
        } = req.body;

        const files = (req.files || {}) as {
          [fieldname: string]: Express.Multer.File[];
        };

        const courseDoc = await currentDb.collection("courses").doc(id).get();
        if (!courseDoc.exists) {
          return res.status(404).json({ error: "Course not found" });
        }

        const existingData = courseDoc.data() || {};

        const parseJson = (val: any, fallback: any) => {
          if (
            val === undefined ||
            val === null ||
            val === "undefined" ||
            val === "null" ||
            val === ""
          ) {
            return fallback;
          }
          try {
            return typeof val === "string" ? JSON.parse(val) : val;
          } catch {
            return fallback;
          }
        };

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (instructor !== undefined) updateData.instructor = instructor;
        if (instructorId !== undefined) updateData.instructorId = instructorId;
        if (level !== undefined) updateData.level = level;
        if (content !== undefined) updateData.content = content;
        if (topics !== undefined) {
          updateData.topics = parseJson(topics, existingData.topics || []);
        }
        if (overallQuiz !== undefined) {
          updateData.overallQuiz = parseJson(
            overallQuiz,
            existingData.overallQuiz || null
          );
        }

        updateData.updatedAt = new Date().toISOString();

        const pdfFile = files["pdf"]?.[0];
        const thumbnailFile = files["thumbnail"]?.[0];

        if (pdfFile) {
          updateData.pdfUrl = await uploadToStorage(pdfFile, "courses/pdfs");
        }

        if (thumbnailFile) {
          updateData.thumbnailUrl = await uploadToStorage(
            thumbnailFile,
            "courses/thumbnails"
          );
        }

        Object.keys(updateData).forEach((key) => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        if (Object.keys(updateData).length === 0) {
          return res.json({ success: true, message: "No changes to update" });
        }

        await currentDb.collection("courses").doc(id).update(updateData);
        res.json({ success: true, id, ...updateData });
      } catch (error: any) {
        console.error("Error updating course:", error);
        res.status(500).json({
          error: error.message || "Internal server error",
          details: error.message,
          code: error.code,
          stack:
            process.env.NODE_ENV === "production" ? undefined : error.stack,
        });
      }
    }
  );

  app.get("/api/debug/courses", async (req, res) => {
    const currentDb = await getDbInstance();
    if (!currentDb) {
      return res.status(500).json({
        error: "Firebase not initialized",
        lastError: lastDbError,
      });
    }

    try {
      const snap = await currentDb.collection("courses").get();
      const courses = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      res.json({ count: snap.size, courses, lastError: lastDbError });
    } catch (error: any) {
      res.status(500).json({ error: error.message, lastError: lastDbError });
    }
  });

  app.get("/api/debug/firebase", async (req, res) => {
    const apps = admin.apps.map((a) => ({
      name: a?.name,
      projectId: a?.options.projectId,
    }));

    res.json({
      env: {
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
        GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
        hasFirebaseServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        hasLocalCredentialsPath: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
      apps,
      configProjectId: firebaseConfig.projectId,
      lastError: lastDbError,
    });
  });

  app.get("/api/stats", async (req, res) => {
    console.log("Stats API called");
    try {
      const currentDb = await getDbInstance();
      if (!currentDb) {
        return res
          .status(500)
          .json({ error: "Firebase not initialized", lastError: lastDbError });
      }

      const studentsSnap = await currentDb
        .collection("users")
        .where("role", "==", "student")
        .get();
      const coursesSnap = await currentDb.collection("courses").get();
      const enrollmentsSnap = await currentDb.collection("enrollments").get();

      const stats = {
        totalStudents: studentsSnap?.size || 0,
        totalCourses: coursesSnap?.size || 0,
        totalEnrollments: enrollmentsSnap?.size || 0,
      };

      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  });

  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(
      `APP_URL: ${process.env.APP_URL || "Not set (using relative paths)"}`
    );
  });

  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error("Global Error Handler:", err);
      res.status(500).json({
        error: "Unhandled server error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  );
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});