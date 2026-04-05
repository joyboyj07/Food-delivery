-- QuickBite Food Delivery App — Enhanced Database Schema
-- 20 Restaurants | 150+ Menu Items | Real Food Images from Unsplash

CREATE DATABASE IF NOT EXISTS quickbite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quickbite;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  phone      VARCHAR(20),
  address    TEXT,
  role       ENUM('customer','admin','restaurant') DEFAULT 'customer',
  avatar     VARCHAR(255),
  is_active  TINYINT(1) DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurants (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  cuisine       VARCHAR(100),
  address       TEXT,
  phone         VARCHAR(30),
  image         VARCHAR(500),
  cover_image   VARCHAR(500),
  rating        DECIMAL(3,2) DEFAULT 4.0,
  review_count  INT DEFAULT 0,
  delivery_time INT DEFAULT 30,
  delivery_fee  DECIMAL(8,2) DEFAULT 30,
  min_order     DECIMAL(8,2) DEFAULT 100,
  is_active     TINYINT(1) DEFAULT 1,
  is_open       TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT,
  name          VARCHAR(100) NOT NULL,
  sort_order    INT DEFAULT 0,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  category_id   INT,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  image         VARCHAR(500),
  is_veg        TINYINT(1) DEFAULT 0,
  is_available  TINYINT(1) DEFAULT 1,
  is_popular    TINYINT(1) DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id)   REFERENCES menu_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cart (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity     INT DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_cart (user_id, menu_item_id),
  FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  order_number     VARCHAR(20) NOT NULL UNIQUE,
  user_id          INT NOT NULL,
  restaurant_id    INT NOT NULL,
  subtotal         DECIMAL(10,2) DEFAULT 0,
  delivery_fee     DECIMAL(10,2) DEFAULT 0,
  tax              DECIMAL(10,2) DEFAULT 0,
  total            DECIMAL(10,2) DEFAULT 0,
  delivery_address TEXT,
  payment_method   ENUM('cod','card','upi') DEFAULT 'cod',
  payment_status   ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  status           ENUM('pending','confirmed','preparing','picked_up','on_the_way','delivered','cancelled') DEFAULT 'pending',
  notes            TEXT,
  delivered_at     DATETIME,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)       REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity     INT NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  total        DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)     REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE TABLE IF NOT EXISTS order_tracking (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  status     VARCHAR(50),
  message    TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  user_id       INT NOT NULL,
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE
);

-- ── USERS ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO users (id,name,email,password,phone,address,role) VALUES
(1,'Admin QuickBite','admin@quickbite.com','placeholder','+91-9000000001','QuickBite HQ, Bangalore','admin'),
(2,'Rahul Sharma','rahul@email.com','placeholder','+91-9000000002','15, MG Road, Bangalore','customer'),
(3,'Priya Nair','priya@email.com','placeholder','+91-9000000003','42, Koramangala, Bangalore','customer'),
(4,'Arjun Mehta','arjun@email.com','placeholder','+91-9000000004','8, Indiranagar, Bangalore','customer');

-- ── 20 RESTAURANTS ───────────────────────────────────────────────────────────
INSERT IGNORE INTO restaurants (id,name,description,cuisine,address,phone,image,cover_image,rating,review_count,delivery_time,delivery_fee,min_order) VALUES
(1,'Spice Garden','Authentic Indian cuisine with rich flavors and aromatic spices passed down through generations.','Indian','45 MG Road, Bangalore','080-1111-2222','https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=900&h=400&fit=crop',4.5,342,35,30,150),
(2,'Pizza Palace','Handcrafted pizzas baked in wood-fired ovens with fresh imported ingredients.','Italian','12 Brigade Road, Bangalore','080-2222-3333','https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&h=400&fit=crop',4.3,228,25,40,200),
(3,'Burger Hub','Juicy gourmet burgers crafted with 100% fresh ingredients daily.','American','78 Koramangala, Bangalore','080-3333-4444','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&h=400&fit=crop',4.4,389,20,25,150),
(4,'Sushi Zen','Premium Japanese cuisine. Master sushi chefs with 15+ years experience.','Japanese','33 Indiranagar, Bangalore','080-4444-5555','https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1553621042-f6e147245754?w=900&h=400&fit=crop',4.7,178,40,60,400),
(5,'Taco Fiesta','Authentic Mexican recipes with fresh tortillas made daily and bold flavors.','Mexican','56 Whitefield, Bangalore','080-5555-6666','https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=900&h=400&fit=crop',4.2,134,30,35,180),
(6,'Dragon Wok','Authentic Chinese flavors from Sichuan to Cantonese, wok-tossed at high heat.','Chinese','90 HSR Layout, Bangalore','080-6666-7777','https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=900&h=400&fit=crop',4.1,267,35,30,200),
(7,'Biryani Bhai','Hyderabads most famous dum biryani slow-cooked for 3 hours with premium basmati.','Biryani','147 Electronic City, Bangalore','080-7777-8888','https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1596797038530-2c107229654b?w=900&h=400&fit=crop',4.6,521,45,20,200),
(8,'Green Bowl','Healthy food that actually tastes amazing. Salads, bowls, smoothies.','Healthy','25 Jayanagar, Bangalore','080-8888-9999','https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&h=400&fit=crop',4.3,156,30,40,250),
(9,'South Spice','Authentic South Indian cuisine. Crispy dosas, fluffy idlis, piping hot sambar.','South Indian','67 Jayanagar, Bangalore','080-9999-0000','https://images.unsplash.com/photo-1567337710282-00832b415979?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1630383249896-424e482df921?w=900&h=400&fit=crop',4.5,445,25,20,100),
(10,'The Dessert Lab','A paradise for sweet lovers! Artisan desserts, gelato, waffles, and signature cakes.','Desserts','18 Church Street, Bangalore','080-0000-1111','https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&h=400&fit=crop',4.6,289,35,50,200),
(11,'Tandoor Tales','North Indian culinary heritage. Our clay tandoor has been burning for 20 years.','North Indian','89 Rajajinagar, Bangalore','080-1122-3344','https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&h=400&fit=crop',4.4,312,40,30,200),
(12,'Pho and Rolls','Vietnamese street food reimagined. Fresh pho broths simmered for 12 hours.','Vietnamese','34 Richmond Town, Bangalore','080-2233-4455','https://images.unsplash.com/photo-1555126634-323283e090fa?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900&h=400&fit=crop',4.3,98,35,45,250),
(13,'Mamas Kitchen','Home-cooked meals made with love every day. Fresh, wholesome, comforting.','Home Food','112 BTM Layout, Bangalore','080-3344-5566','https://images.unsplash.com/photo-1547592180-85f173990554?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&h=400&fit=crop',4.7,634,30,15,100),
(14,'Wings and Things','Buffalo wings, loaded fries, and American comfort food done right.','American','45 Yelahanka, Bangalore','080-4455-6677','https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&h=400&fit=crop',4.2,189,25,35,200),
(15,'Cafe Mocha','Artisan coffee, all-day breakfast, freshly baked pastries delivered to your door.','Cafe','7 Cunningham Road, Bangalore','080-5566-7788','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&h=400&fit=crop',4.5,267,20,30,150),
(16,'Kerala Kitchen','Straight from Gods Own Country. Fish curry, appam, beef fry, sadya platters.','Kerala','56 Frazer Town, Bangalore','080-6677-8899','https://images.unsplash.com/photo-1630383249896-424e482df921?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=900&h=400&fit=crop',4.4,234,40,25,150),
(17,'Street Eats','Pani puri, bhel puri, vada pav, pav bhaji. Hygienic street food at home.','Street Food','Malleshwaram, Bangalore','080-7788-9900','https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=900&h=400&fit=crop',4.0,445,20,10,80),
(18,'Pasta Perfecto','Italian pasta made from scratch daily with imported cheese and fresh herbs.','Italian','29 Lavelle Road, Bangalore','080-8899-0011','https://images.unsplash.com/photo-1551183053-bf91798d765e?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&h=400&fit=crop',4.4,178,30,40,220),
(19,'BBQ Nation Express','Smoky slow-cooked BBQ ribs, brisket, grilled chicken over hardwood charcoal.','BBQ','67 Marathahalli, Bangalore','080-9900-1122','https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1544025162-d76694265947?w=900&h=400&fit=crop',4.3,201,40,50,300),
(20,'Shake Factory','Premium milkshakes, frappes, fresh juices and smoothies. 50+ flavors.','Beverages','15 UB City, Bangalore','080-0011-2233','https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&h=350&fit=crop','https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=900&h=400&fit=crop',4.5,389,20,20,100);

-- ── MENU CATEGORIES ───────────────────────────────────────────────────────────
INSERT IGNORE INTO menu_categories (id,restaurant_id,name,sort_order) VALUES
(1,1,'Starters',1),(2,1,'Main Course',2),(3,1,'Breads',3),(4,1,'Rice',4),(5,1,'Desserts',5),
(6,2,'Veg Pizzas',1),(7,2,'Non-Veg Pizzas',2),(8,2,'Pasta',3),(9,2,'Sides',4),
(10,3,'Signature Burgers',1),(11,3,'Chicken Burgers',2),(12,3,'Veg Burgers',3),(13,3,'Sides',4),(14,3,'Shakes',5),
(15,4,'Sushi Rolls',1),(16,4,'Nigiri',2),(17,4,'Ramen',3),(18,4,'Starters',4),
(19,5,'Tacos',1),(20,5,'Burritos',2),(21,5,'Nachos',3),(22,5,'Drinks',4),
(23,6,'Dim Sum',1),(24,6,'Noodles',2),(25,6,'Rice',3),(26,6,'Soups',4),(27,6,'Mains',5),
(28,7,'Biryani',1),(29,7,'Kebabs',2),(30,7,'Gravies',3),(31,7,'Breads',4),
(33,8,'Salads',1),(34,8,'Power Bowls',2),(35,8,'Wraps',3),(36,8,'Smoothies',4),(37,8,'Juices',5),
(38,9,'Dosa',1),(39,9,'Idli and Vada',2),(40,9,'Rice',3),(41,9,'Drinks',4),
(42,10,'Cakes',1),(43,10,'Gelato',2),(44,10,'Waffles',3),(45,10,'Mousse',4),(46,10,'Hot Drinks',5),
(47,11,'Starters',1),(48,11,'Curries',2),(49,11,'Dal',3),(50,11,'Breads',4),
(51,12,'Pho',1),(52,12,'Spring Rolls',2),(53,12,'Banh Mi',3),(54,12,'Drinks',4),
(55,13,'Breakfast',1),(56,13,'Thali',2),(57,13,'Sabzi',3),(58,13,'Desserts',4),
(59,14,'Wings',1),(60,14,'Burgers',2),(61,14,'Fries',3),
(63,15,'Hot Coffee',1),(64,15,'Cold Coffee',2),(65,15,'Breakfast',3),(66,15,'Sandwiches',4),(67,15,'Pastries',5),
(68,16,'Rice and Curry',1),(69,16,'Seafood',2),(70,16,'Appam',3),(71,16,'Snacks',4),
(72,17,'Chaat',1),(73,17,'Sandwiches',2),(74,17,'Pav',3),(75,17,'Sweets',4),
(76,18,'Pasta',1),(77,18,'Risotto',2),(78,18,'Sides',3),(79,18,'Desserts',4),
(80,19,'BBQ Mains',1),(81,19,'Sides',2),(82,19,'Soups',3),
(83,20,'Milkshakes',1),(84,20,'Frappes',2),(85,20,'Juices',3),(86,20,'Smoothies',4);

-- ── 150+ MENU ITEMS ───────────────────────────────────────────────────────────
INSERT IGNORE INTO menu_items (restaurant_id,category_id,name,description,price,image,is_veg,is_popular) VALUES
-- SPICE GARDEN (1)
(1,1,'Paneer Tikka','Marinated cottage cheese cubes grilled in tandoor with spiced yogurt. Served with mint chutney.',240,'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=280&fit=crop',1,1),
(1,1,'Chicken Malai Tikka','Tender chicken in cream and mild spices, grilled to perfection. Melt-in-mouth.',280,'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=280&fit=crop',0,1),
(1,1,'Veg Samosa (4 pcs)','Crispy golden pastry stuffed with spiced potatoes and peas.',90,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',1,0),
(1,1,'Onion Bhaji','Crispy onion fritters seasoned with cumin and coriander.',120,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',1,0),
(1,2,'Butter Chicken','Iconic slow-cooked chicken in rich creamy tomato-butter sauce. The dish that conquered the world.',340,'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=280&fit=crop',0,1),
(1,2,'Dal Makhani','Black lentils simmered overnight with butter and cream. Crown jewel of Indian dals.',190,'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=280&fit=crop',1,1),
(1,2,'Palak Paneer','Fresh cottage cheese in smooth spiced spinach gravy.',210,'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=280&fit=crop',1,0),
(1,2,'Lamb Rogan Josh','Kashmiri-style slow-cooked lamb in aromatic spices.',380,'https://images.unsplash.com/photo-1545247181-516773cae754?w=400&h=280&fit=crop',0,1),
(1,2,'Chicken Tikka Masala','Grilled chicken tikka in spiced tomato-cream sauce.',340,'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=280&fit=crop',0,1),
(1,3,'Butter Naan','Soft leavened bread baked in tandoor, brushed with salted butter.',60,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=280&fit=crop',1,0),
(1,3,'Garlic Naan','Butter naan topped with freshly minced garlic and coriander.',75,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=280&fit=crop',1,0),
(1,4,'Chicken Biryani','Fragrant basmati rice cooked with tender chicken and whole spices.',320,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=280&fit=crop',0,1),
(1,5,'Gulab Jamun (4 pcs)','Soft milk dumplings soaked in rose-flavored sugar syrup.',130,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop',1,0),
-- PIZZA PALACE (2)
(2,6,'Margherita','Classic tomato sauce, fresh mozzarella and basil. Simple perfection.',280,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=280&fit=crop',1,1),
(2,6,'Veggie Supreme','Bell peppers, mushrooms, olives, onions on garlic-herb base.',340,'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=280&fit=crop',1,0),
(2,6,'Paneer Tikka Pizza','Spiced paneer, capsicum and onion on tandoori sauce. Indo-Italian fusion!',360,'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=280&fit=crop',1,1),
(2,6,'Four Cheese Pizza','Mozzarella, cheddar, parmesan and gorgonzola on white cream sauce.',400,'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=280&fit=crop',1,0),
(2,7,'Chicken BBQ Pizza','Smoky BBQ chicken, caramelized onions, jalapenos on BBQ sauce.',400,'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=280&fit=crop',0,1),
(2,7,'Pepperoni Classic','Premium pepperoni with extra mozzarella on tomato base.',380,'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=280&fit=crop',0,1),
(2,8,'Penne Arrabbiata','Penne pasta in spicy tomato-chili sauce with fresh basil.',260,'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=280&fit=crop',1,0),
(2,8,'Chicken Alfredo','Fettuccine in rich parmesan cream sauce with grilled chicken.',320,'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&h=280&fit=crop',0,1),
(2,9,'Garlic Bread with Cheese','Toasted bread loaded with garlic butter and melted cheese.',140,'https://images.unsplash.com/photo-1619531040576-f9416740661e?w=400&h=280&fit=crop',1,0),
(2,9,'Tiramisu','Classic Italian dessert with coffee-soaked ladyfingers and mascarpone.',200,'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=280&fit=crop',1,0),
-- BURGER HUB (3)
(3,10,'The Classic Smash','Double smash beef patty, American cheese, pickles, onions, special sauce.',280,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop',0,1),
(3,10,'BBQ Bacon Stack','Triple beef patty with crispy bacon, BBQ sauce, cheddar and coleslaw.',380,'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=280&fit=crop',0,1),
(3,10,'Mushroom Swiss Burger','Beef patty with sauteed mushrooms, Swiss cheese and aioli.',320,'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=280&fit=crop',0,0),
(3,11,'Crispy Chicken Deluxe','Hand-battered crispy chicken, lettuce, tomato, mayo and pickles.',240,'https://images.unsplash.com/photo-1551615593-ef5fe247e8f7?w=400&h=280&fit=crop',0,1),
(3,11,'Spicy Nashville Hot','Nashville hot chicken thigh, jalapenos, pickled slaw. Very spicy!',260,'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=280&fit=crop',0,0),
(3,12,'The Garden Burger','House-made black bean and quinoa patty, avocado, sprouts.',220,'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=280&fit=crop',1,0),
(3,12,'Paneer Masala Burger','Spiced paneer patty in brioche bun with tamarind chutney.',200,'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=280&fit=crop',1,1),
(3,13,'Loaded Cheese Fries','Crispy fries smothered in cheese sauce, jalapenos, sour cream.',170,'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=280&fit=crop',1,1),
(3,13,'Onion Rings (8 pcs)','Beer-battered crispy onion rings with ranch dipping sauce.',150,'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=400&h=280&fit=crop',1,0),
(3,14,'Oreo Milkshake','Thick creamy milkshake blended with Oreo cookies and vanilla ice cream.',160,'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=280&fit=crop',1,1),
(3,14,'Chocolate Brownie Shake','Rich dark chocolate shake with brownie pieces and whipped cream.',170,'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=280&fit=crop',1,0),
-- SUSHI ZEN (4)
(4,15,'Dragon Roll (8 pcs)','Shrimp tempura, avocado, spicy mayo and eel sauce.',520,'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&h=280&fit=crop',0,1),
(4,15,'California Roll (8 pcs)','Imitation crab, avocado, cucumber, sesame seeds.',380,'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=280&fit=crop',0,1),
(4,15,'Spicy Tuna Roll (8 pcs)','Fresh tuna, spicy mayo, cucumber, scallions.',440,'https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&h=280&fit=crop',0,0),
(4,15,'Rainbow Roll (8 pcs)','California roll topped with salmon, tuna, avocado.',580,'https://images.unsplash.com/photo-1617196034094-a76f4c0fae6a?w=400&h=280&fit=crop',0,1),
(4,15,'Veggie Avocado Roll','Avocado, cucumber, pickled radish, sesame. Fresh and clean.',320,'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=280&fit=crop',1,0),
(4,16,'Salmon Nigiri (2 pcs)','Fresh Atlantic salmon over hand-pressed sushi rice.',260,'https://images.unsplash.com/photo-1558985250-27a406d64cb3?w=400&h=280&fit=crop',0,0),
(4,17,'Tonkotsu Ramen','Rich pork bone broth, thin noodles, chashu pork, soft egg, nori.',460,'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=280&fit=crop',0,1),
(4,17,'Vegetable Miso Ramen','White miso broth, ramen noodles, tofu, mushrooms, corn.',380,'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=280&fit=crop',1,0),
(4,18,'Edamame','Steamed Japanese soybeans with sea salt.',150,'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=280&fit=crop',1,0),
-- TACO FIESTA (5)
(5,19,'Street Beef Tacos (3 pcs)','Seasoned beef, pico de gallo, cotija cheese, cilantro on corn tortillas.',280,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop',0,1),
(5,19,'Grilled Chicken Tacos (3 pcs)','Marinated grilled chicken, shredded cabbage, avocado crema.',260,'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=280&fit=crop',0,1),
(5,19,'Fish Tacos (3 pcs)','Beer-battered fish, shredded slaw, chipotle mayo, lime.',300,'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=400&h=280&fit=crop',0,0),
(5,19,'Veggie Tacos (3 pcs)','Grilled peppers, black beans, guacamole, salsa on flour tortillas.',240,'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=280&fit=crop',1,0),
(5,20,'Chicken Burrito','Grilled chicken, cilantro rice, black beans, cheese, salsa wrapped tight.',340,'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=280&fit=crop',0,1),
(5,21,'Loaded Nachos','Tortilla chips, melted cheese, jalapenos, black beans, guacamole, sour cream.',280,'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=280&fit=crop',1,1),
(5,21,'Guacamole and Chips','Fresh chunky guacamole with lime, jalapeno, cilantro.',180,'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&h=280&fit=crop',1,0),
-- DRAGON WOK (6)
(6,23,'Steamed Dim Sum (6 pcs)','Delicate steamed dumplings filled with pork and shrimp.',220,'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=280&fit=crop',0,1),
(6,23,'Veg Dim Sum (6 pcs)','Steamed dumplings with tofu, mushroom and bamboo shoots.',200,'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=280&fit=crop',1,0),
(6,23,'Spring Rolls (4 pcs)','Crispy deep-fried rolls with vegetables. Served with sweet chili.',140,'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400&h=280&fit=crop',1,0),
(6,24,'Chicken Hakka Noodles','Stir-fried flat noodles with chicken, vegetables, soy and oyster sauce.',240,'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=280&fit=crop',0,1),
(6,24,'Veg Chow Mein','Wok-tossed noodles with fresh vegetables in savory brown sauce.',200,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=280&fit=crop',1,0),
(6,25,'Chicken Fried Rice','Wok-tossed jasmine rice with egg, chicken, vegetables and soy.',220,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=280&fit=crop',0,1),
(6,25,'Vegetable Fried Rice','Classic fried rice with seasonal vegetables and soy sauce.',180,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=280&fit=crop',1,0),
(6,26,'Hot and Sour Soup','Classic Chinese soup with mushrooms, tofu, bamboo shoots.',160,'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=280&fit=crop',1,0),
(6,27,'Kung Pao Chicken','Diced chicken stir-fried with peanuts, chillies and Sichuan pepper.',280,'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=280&fit=crop',0,1),
-- BIRYANI BHAI (7)
(7,28,'Chicken Biryani Full','Slow-cooked dum biryani with whole spices, saffron and caramelized onions.',320,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=280&fit=crop',0,1),
(7,28,'Mutton Biryani Full','Premium mutton slow-cooked with fragrant basmati and secret spice blend.',400,'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=280&fit=crop',0,1),
(7,28,'Veg Biryani','Garden-fresh vegetables layered with aromatic basmati rice.',240,'https://images.unsplash.com/photo-1645177628172-a786f4f3c0b0?w=400&h=280&fit=crop',1,0),
(7,28,'Egg Biryani','Golden fried eggs layered in fragrant saffron rice.',260,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=280&fit=crop',0,0),
(7,29,'Seekh Kebab (4 pcs)','Minced lamb and herbs grilled on skewers. Juicy and aromatic.',300,'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=280&fit=crop',0,1),
(7,30,'Chicken Korma','Slow-cooked chicken in creamy cashew and onion gravy.',300,'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=280&fit=crop',0,0),
(7,31,'Rumali Roti','Paper-thin whole wheat bread folded like a handkerchief.',50,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=280&fit=crop',1,0),
-- GREEN BOWL (8)
(8,33,'Caesar Salad','Romaine, parmesan, croutons, house-made Caesar dressing.',280,'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop',1,1),
(8,33,'Greek Salad','Tomatoes, cucumber, olives, feta cheese, red onion, oregano.',260,'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=280&fit=crop',1,0),
(8,34,'Quinoa Power Bowl','Tri-color quinoa, roasted veggies, avocado, hummus, tahini dressing.',340,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=280&fit=crop',1,1),
(8,34,'Buddha Bowl','Brown rice, roasted sweet potato, chickpeas, kale, lemon tahini.',320,'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop',1,0),
(8,35,'Grilled Chicken Wrap','Grilled chicken, avocado, lettuce, tomato, light mayo in whole-wheat wrap.',300,'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop',0,0),
(8,36,'Green Detox Smoothie','Spinach, kale, apple, ginger, lemon, chia seeds.',200,'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400&h=280&fit=crop',1,1),
(8,36,'Berry Blast Smoothie','Mixed berries, banana, almond milk, honey, flaxseed.',220,'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=280&fit=crop',1,0),
(8,37,'Fresh Orange Juice','Cold-pressed oranges. No added sugar or preservatives.',160,'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=280&fit=crop',1,0),
-- SOUTH SPICE (9)
(9,38,'Masala Dosa','Crispy rice crepe filled with spiced potato masala. With sambar and 3 chutneys.',120,'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=280&fit=crop',1,1),
(9,38,'Plain Dosa','Classic thin crispy dosa. Light, wholesome, delicious.',90,'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=280&fit=crop',1,0),
(9,38,'Rava Dosa','Crispy semolina crepe with cashews and curry leaves.',130,'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=280&fit=crop',1,0),
(9,38,'Onion Uttapam','Thick rice pancake topped with onions, green chillies and tomatoes.',130,'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=280&fit=crop',1,0),
(9,39,'Idli (4 pcs)','Soft steamed rice cakes. With sambar and coconut chutney.',90,'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=280&fit=crop',1,1),
(9,39,'Medu Vada (2 pcs)','Crispy lentil donuts with a soft interior.',100,'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=280&fit=crop',1,0),
(9,40,'Curd Rice','Steamed rice with yogurt, tempered with mustard and curry leaves.',140,'https://images.unsplash.com/photo-1645177628172-a786f4f3c0b0?w=400&h=280&fit=crop',1,0),
(9,41,'Filter Coffee','Strong South Indian decoction with steamed milk. Traditional tumbler.',60,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=280&fit=crop',1,1),
(9,41,'Mango Lassi','Sweet mango blended with fresh yogurt. Refreshingly thick.',100,'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=280&fit=crop',1,1),
-- DESSERT LAB (10)
(10,42,'Chocolate Lava Cake','Warm dark chocolate cake with molten center. Served with vanilla gelato.',280,'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=280&fit=crop',1,1),
(10,42,'New York Cheesecake','Classic dense creamy cheesecake with graham cracker crust, berry coulis.',260,'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=280&fit=crop',1,1),
(10,42,'Red Velvet Cake','Moist red velvet layers with cream cheese frosting.',240,'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=400&h=280&fit=crop',1,0),
(10,42,'Tiramisu','Espresso-soaked ladyfingers, mascarpone cream, cocoa dust.',250,'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=280&fit=crop',1,1),
(10,43,'Belgian Chocolate Gelato','Rich dark Belgian chocolate gelato. Intense and smooth.',180,'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&h=280&fit=crop',1,0),
(10,43,'3-Scoop Sundae','Choose any 3 gelato flavors with hot fudge, whipped cream, cherry.',280,'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=280&fit=crop',1,1),
(10,44,'Belgian Waffle','Fluffy waffle with fresh strawberries, Nutella, whipped cream.',260,'https://images.unsplash.com/photo-1562376552-0d160a2f23ca?w=400&h=280&fit=crop',1,1),
(10,44,'Lotus Biscoff Waffle','Crispy waffle with Biscoff spread, biscuit crumble, vanilla gelato.',280,'https://images.unsplash.com/photo-1562376552-0d160a2f23ca?w=400&h=280&fit=crop',1,0),
(10,45,'Dark Chocolate Mousse','Silky smooth dark chocolate mousse with raspberry coulis.',220,'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=280&fit=crop',1,0),
(10,46,'Hot Chocolate','Rich Belgian hot chocolate with marshmallows and cream.',160,'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=280&fit=crop',1,0),
-- TANDOOR TALES (11)
(11,47,'Tandoori Chicken half','Chicken marinated in spiced yogurt, roasted in clay tandoor.',320,'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=280&fit=crop',0,1),
(11,47,'Galouti Kebab (4 pcs)','Melt-in-mouth minced lamb patties. A royal Lucknow recipe.',320,'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=280&fit=crop',0,1),
(11,48,'Shahi Paneer','Paneer in rich tomato-cashew gravy fit for royalty.',260,'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=280&fit=crop',1,1),
(11,49,'Dal Tadka','Yellow lentils with ghee tempering, cumin, garlic and dried red chillies.',180,'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=280&fit=crop',1,1),
(11,50,'Lachha Paratha','Multi-layered flaky whole wheat bread with crispy exterior.',80,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=280&fit=crop',1,0),
-- PHO AND ROLLS (12)
(12,51,'Beef Pho','Slow-cooked bone broth with rice noodles, rare beef and fresh herbs.',380,'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=280&fit=crop',0,1),
(12,51,'Chicken Pho','Fragrant chicken broth with rice noodles, shredded chicken, herbs.',340,'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=280&fit=crop',0,1),
(12,51,'Vegetable Pho','Clear vegetable broth with glass noodles, tofu and seasonal vegetables.',300,'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=280&fit=crop',1,0),
(12,53,'Chicken Banh Mi','Vietnamese baguette with grilled chicken, pickled daikon, jalapenos, cilantro.',280,'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=280&fit=crop',0,1),
-- MAMAS KITCHEN (13)
(13,55,'Poha','Flattened rice with onions, peas, peanuts, curry leaves. Light breakfast.',90,'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=280&fit=crop',1,1),
(13,55,'Paratha with Curd','Stuffed whole wheat bread - aloo, gobi or paneer. With fresh curd.',160,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=280&fit=crop',1,0),
(13,56,'Veg Thali Full','Dal, 2 sabzi, rice, roti, salad, papad and sweet. Complete balanced meal.',220,'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=280&fit=crop',1,1),
(13,56,'Non-Veg Thali','Chicken curry, dal, rice, roti, salad, papad and raita.',280,'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=280&fit=crop',0,1),
(13,57,'Rajma Chawal','Kidney bean curry with steamed basmati rice. Indian comfort food.',180,'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=280&fit=crop',1,1),
(13,57,'Aloo Gobi','Potatoes and cauliflower stir-fried with cumin, ginger and spices.',160,'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=280&fit=crop',1,0),
(13,58,'Gajar Halwa','Carrot halwa made with ghee and dry fruits. Comfort dessert.',120,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop',1,0),
-- WINGS AND THINGS (14)
(14,59,'Buffalo Wings (6 pcs)','Crispy wings tossed in Franks RedHot buffalo sauce.',280,'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=280&fit=crop',0,1),
(14,59,'Honey Garlic Wings (6 pcs)','Sweet and sticky honey garlic glazed wings with sesame.',300,'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&h=280&fit=crop',0,1),
(14,59,'BBQ Wings (6 pcs)','Smoky BBQ sauce wings slow-baked then crisped.',280,'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=280&fit=crop',0,0),
(14,59,'Korean Gochujang Wings (6 pcs)','Sweet and spicy Korean chili paste wings with sesame.',320,'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&h=280&fit=crop',0,1),
(14,60,'Double Smash Burger','Double smash beef patty, cheese, caramelized onions, secret sauce.',300,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop',0,1),
(14,61,'Loaded Cheese Fries','Fries in nacho cheese sauce with jalapenos and sour cream.',200,'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=280&fit=crop',1,0),
-- CAFE MOCHA (15)
(15,63,'Cappuccino','Double espresso shot with steamed milk foam. Perfect balance.',140,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=280&fit=crop',1,1),
(15,63,'Caramel Latte','Espresso, steamed milk, house-made caramel sauce.',180,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=280&fit=crop',1,1),
(15,64,'Cold Brew','12-hour slow-brewed cold coffee. Smooth, low-acid.',180,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=280&fit=crop',1,1),
(15,64,'Mocha Frappe','Blended coffee, chocolate sauce, milk, ice cream.',220,'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=280&fit=crop',1,0),
(15,65,'Avocado Toast','Sourdough with smashed avocado, cherry tomatoes, feta, microgreens.',240,'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=280&fit=crop',1,1),
(15,65,'Eggs Benedict','Poached eggs on English muffin with Canadian bacon and hollandaise.',280,'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=280&fit=crop',0,1),
(15,66,'Club Sandwich','Triple-decker with chicken, bacon, egg, lettuce, tomato, mayo.',260,'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=280&fit=crop',0,0),
(15,67,'Croissant','Buttery flaky French croissant. Plain or chocolate-filled.',120,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=280&fit=crop',1,0),
(15,67,'Blueberry Muffin','Moist muffin bursting with fresh blueberries. Baked daily.',110,'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&h=280&fit=crop',1,0),
-- KERALA KITCHEN (16)
(16,68,'Kerala Fish Curry','Red snapper in tangy coconut milk and Malabar tamarind gravy.',340,'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=280&fit=crop',0,1),
(16,68,'Vegetable Stew','Mixed vegetables in light coconut milk gravy.',200,'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=280&fit=crop',1,1),
(16,69,'Karimeen Pollichathu','Pearl spot fish marinated in spices, grilled in banana leaf.',420,'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=280&fit=crop',0,1),
(16,69,'Prawn Masala','Juicy prawns in fiery Kerala masala with coconut and curry leaves.',380,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop',0,0),
(16,70,'Appam (4 pcs)','Lacy rice hoppers with crispy edges and soft center. With stew.',160,'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=280&fit=crop',1,1),
(16,71,'Banana Chips','Crispy Kerala plantain chips fried in coconut oil.',80,'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=400&h=280&fit=crop',1,0),
(16,71,'Pazham Pori (4 pcs)','Ripe banana fritters dipped in rice flour batter, fried golden.',100,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',1,1),
-- STREET EATS (17)
(17,72,'Pani Puri (8 pcs)','Crispy hollow balls filled with spiced potato, chickpeas, tamarind water.',80,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',1,1),
(17,72,'Bhel Puri','Puffed rice, sev, peanuts, onion, tomato tossed in chutneys.',100,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',1,0),
(17,72,'Dahi Puri (8 pcs)','Puris filled with potato, chickpeas, thick yogurt, sweet chutneys.',120,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',1,1),
(17,73,'Mumbai Vada Pav','Spicy potato vada in soft bun with three chutneys. The Indian burger.',70,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',1,1),
(17,74,'Pav Bhaji','Spiced mashed vegetable curry with buttered bread rolls.',140,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',1,1),
(17,75,'Matka Kulfi (2 pcs)','Traditional Indian ice cream in clay pots. Pista, mango or rose.',120,'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&h=280&fit=crop',1,1),
-- PASTA PERFECTO (18)
(18,76,'Spaghetti Carbonara','Spaghetti with eggs, pecorino, guanciale, black pepper. Roman classic.',320,'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&h=280&fit=crop',0,1),
(18,76,'Penne Arrabiata','Penne in fiery tomato-garlic-chili sauce.',260,'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=280&fit=crop',1,0),
(18,76,'Fettuccine Alfredo','Silky parmesan cream sauce on fresh fettuccine pasta.',300,'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&h=280&fit=crop',1,1),
(18,76,'Lasagna','Layered pasta with Bolognese sauce, bechamel and mozzarella.',360,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=280&fit=crop',0,1),
(18,77,'Mushroom Risotto','Arborio rice slowly cooked with wild mushrooms, white wine and parmesan.',340,'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=280&fit=crop',1,1),
(18,78,'Bruschetta (4 pcs)','Toasted sourdough with fresh tomatoes, basil and extra virgin olive oil.',160,'https://images.unsplash.com/photo-1506280754576-f6fa8a873550?w=400&h=280&fit=crop',1,0),
(18,79,'Panna Cotta','Silky cooked cream dessert with vanilla bean and berry compote.',200,'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&h=280&fit=crop',1,0),
-- BBQ NATION (19)
(19,80,'BBQ Pork Ribs Half Rack','Slow-smoked pork ribs with dry rub, glazed with house BBQ sauce.',680,'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=280&fit=crop',0,1),
(19,80,'Smoked Brisket 200g','12-hour oak-smoked Texas-style beef brisket.',580,'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=280&fit=crop',0,1),
(19,80,'Grilled Chicken','Herb-marinated half chicken char-grilled over hardwood charcoal.',380,'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&h=280&fit=crop',0,0),
(19,81,'Grilled Corn on Cob','Sweet corn grilled with chili butter and lime.',120,'https://images.unsplash.com/photo-1516685018646-549198525c1b?w=400&h=280&fit=crop',1,0),
(19,81,'BBQ Coleslaw','Creamy tangy coleslaw with apple and raisins.',100,'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop',1,0),
(19,82,'Smoked Tomato Soup','Rich tomato soup smoked over hickory wood.',160,'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=280&fit=crop',1,0),
-- SHAKE FACTORY (20)
(20,83,'Nutella Banana Shake','Creamy milkshake blended with Nutella and fresh banana.',220,'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=280&fit=crop',1,1),
(20,83,'Oreo Cookies and Cream','Thick creamy shake loaded with Oreo cookies and vanilla ice cream.',240,'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=280&fit=crop',1,1),
(20,83,'Salted Caramel Shake','House-made salted caramel blended with vanilla ice cream.',230,'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=280&fit=crop',1,0),
(20,83,'Strawberry Dream','Fresh strawberry milkshake with real fruit chunks.',200,'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=280&fit=crop',1,0),
(20,84,'Cold Coffee Frappe','Strong coffee blended with ice cream and milk.',200,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=280&fit=crop',1,1),
(20,84,'Mocha Frappe','Chocolate and coffee frappe with whipped cream.',210,'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=280&fit=crop',1,0),
(20,85,'Fresh Lime Soda','Cold pressed lime with soda, mint and black salt.',100,'https://images.unsplash.com/photo-1587038913829-a7c9e88e12e2?w=400&h=280&fit=crop',1,0),
(20,85,'Watermelon Juice','Pure cold-pressed watermelon juice. No sugar added.',130,'https://images.unsplash.com/photo-1587038913829-a7c9e88e12e2?w=400&h=280&fit=crop',1,1),
(20,86,'Mango Banana Smoothie','Alphonso mango blended with banana, almond milk and honey.',200,'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400&h=280&fit=crop',1,1),
(20,86,'Avocado Smoothie','Creamy avocado, spinach, banana, almond milk. Nutrient powerhouse.',220,'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400&h=280&fit=crop',1,0);

-- ── REVIEWS ───────────────────────────────────────────────────────────────────
INSERT IGNORE INTO reviews (restaurant_id,user_id,rating,comment) VALUES
(1,2,5,'The butter chicken was absolutely divine! Rich, creamy and perfectly spiced. Will order again!'),
(1,3,4,'Great food, fast delivery. The naan was soft and warm. Highly recommend the Dal Makhani.'),
(2,2,5,'Best pizza I have had outside Italy. The four cheese pizza is to die for!'),
(3,3,5,'The smash burger is incredible. Juicy, messy, and absolutely perfect. 10/10!'),
(4,4,5,'Freshest sushi I have had in Bangalore. The dragon roll is a masterpiece.'),
(7,2,5,'This biryani is life changing. Authentic Hyderabadi taste. The mutton was so tender!'),
(7,3,5,'Best biryani in Bangalore, no contest. The seekh kebabs were also fantastic!'),
(9,4,5,'Crispy masala dosa with fluffy coconut chutney. Transported me back to Chennai!'),
(10,2,5,'The chocolate lava cake was warm gooey perfection. Dessert Lab is a gem!'),
(13,3,5,'Mamas thali is the most comforting meal. Tastes exactly like home cooking.'),
(15,4,4,'Great coffee and the avocado toast is Instagram-worthy and delicious!'),
(17,2,5,'The pani puri is the best I have had outside Mumbai. So authentic!'),
(20,3,5,'Nutella banana shake is incredibly thick and delicious. So filling!'),
(16,2,5,'Kerala fish curry is outstanding! The coconut milk gravy is heavenly.'),
(19,4,4,'BBQ ribs were fall-off-the-bone tender. Amazing smoky flavor!');

-- ── SAMPLE ORDERS ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO orders (id,order_number,user_id,restaurant_id,subtotal,delivery_fee,tax,total,delivery_address,payment_method,status,payment_status) VALUES
(1,'QB10000001',2,7,720,20,36,776,'15, MG Road, Koramangala, Bangalore 560001','cod','delivered','paid'),
(2,'QB10000002',2,3,450,25,22.50,497.50,'15, MG Road, Koramangala, Bangalore 560001','upi','delivered','paid'),
(3,'QB10000003',3,1,860,30,43,933,'42, Koramangala 4th Block, Bangalore','cod','delivered','paid'),
(4,'QB10000004',4,4,900,60,45,1005,'8, Indiranagar, Bangalore','card','preparing','pending');

INSERT IGNORE INTO order_tracking (order_id,status,message) VALUES
(1,'pending','Order placed'),(1,'confirmed','Restaurant confirmed'),(1,'delivered','Delivered!'),
(2,'pending','Order placed'),(2,'delivered','Delivered!'),
(3,'pending','Order placed'),(3,'delivered','Delivered!'),
(4,'pending','Order placed'),(4,'confirmed','Restaurant confirmed'),(4,'preparing','Chef is cooking your food');
