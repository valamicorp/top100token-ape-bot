

# How to get Telegram plugin settings?

``` It is not that easy ```

#### 1. Obtaining an API ID and Hash
- Obtaining your API ID and Hash
- Follow this link (https://my.telegram.org/) and login with your phone number.
- Click under API Development tools.
A Create new application window will appear. Fill in your application details. There is no need to enter any URL, and only the first two fields (App title and Short name) can be changed later as long as I'm aware.
Click on Create application at the end. Now that you have the API ID and Hash.


#### 2. How to get SESSION:
- You need to create your sessionString with a code snippet:
https://gram.js.org/#installation

```
console.log(client.session.save()); // This value what u need
```

Telegram Sessions have no expiry date so you can use it until revoke.


#### 3. Channel name
- It is equal with the ending of your telegram link e.g.
```
Link: https://t.me/top100token
Channel name: top100token
```
