# Data Model

## Core collections

### User

- `name`
- `email`
- `mobile`
- `address`
- `city`
- `state`
- `country`
- `pinCode`
- `companyName`
- `gstNumber`
- `passwordHash`
- `role`
- `status`
- `registeredAt`
- `kycDocuments`
- `refreshTokens`
- `cart.items[]`
- `cart.specialInstructions`
- `wishlist.collections[]`
- `wishlist.items[]`
- `resetOtp`

### Product

- `styleCode`
- `name`
- `description`
- `category`
- `subCategory`
- `collection`
- `metalType`
- `metalColor`
- `metal`
- `diamondWeight`
- `goldWeight`
- `diamondQuality`
- `settingType`
- `occasion`
- `sku`
- `stockType`
- `stockQuantity`
- `status`
- `isNewArrival`
- `isBestSeller`
- `media[]`
- `customizationOptions`
- `specifications[]`
- `views`
- `cartAdds`
- `orderCount`

### Taxonomy

- `Category`: `name`, `slug`, `image`, `active`
- `SubCategory`: `name`, `slug`, `category`, `image`, `active`
- `Collection`: `name`, `slug`, `category`, `subCategory`, `image`, `active`
- `MetalOption`: `name`, `group`, `swatch`, `active`

### Order

- `orderId`
- `user`
- `status`
- `statusHistory[]`
- `paymentMethod`
- `shippingAddress`
- `notes`
- `items[]`
- `stockDeducted`

### Catalogue

- `name`
- `description`
- `coverImage`
- `products[]`
- `assignedUsers[]`
- `active`
- `archived`

### Marketing/content

- `Banner`
- `PopupAd`
- `Event`
- `Testimonial`
- `SiteSettings`

## Shared asset shape

- `publicId`
- `secureUrl`
- `width`
- `height`
- `alt`
- `resourceType`

## Contracts that must stay documented

- Any new collection
- Any field rename
- Any change from string values to ObjectId references
- Any change to the Cloudinary asset shape
