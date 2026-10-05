const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
// Website files live in the frontend folder
const SITE_DIR = path.join(__dirname, '..', 'frontend');

// ─── Helper: format date like "June 22, 2026" ───────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return 'June 15, 2026';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Helper: generate blog post HTML ────────────────────────────────────────
function generateBlogHtml({ title, category, date, readTime, content, filename }) {
    const formattedDate = formatDate(date);
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} — MyBlog</title>
    <meta name="description" content="${title} published on MyBlog." />
    <link rel="stylesheet" href="css/style.css" />
</head>

<body>

    <header>
        <nav class="navbar">
            <a href="index.html" class="logo">My<span>Blog</span></a>
            <ul class="nav-links">
                <li><a href="index.html">Home</a></li>
                <li><a href="blogs.html">Blogs</a></li>
                <li><a href="about.html">About</a></li>
                <li><a href="admin.html">✍️ Write</a></li>
            </ul>
            <button id="theme-toggle">Dark Mode</button>
        </nav>
    </header>

    <main class="post-page">
        <div class="post-nav-bar">
            <a href="blogs.html" class="back-link">← Back to All Blogs</a>
            <div class="post-action-btns">
                <button class="btn-card-action btn-edit action-edit-post" data-file="${filename}" data-title="${title}">✏️ Edit Post</button>
                <button class="btn-card-action btn-delete action-delete-post" data-file="${filename}" data-title="${title}">🗑️ Delete Post</button>
            </div>
        </div>

        <article class="post-full">
            <span class="category">${category}</span>
            <h1>${title}</h1>
            <div class="post-meta">
                <span>${formattedDate}</span>
                <span id="read-time">${readTime}</span>
            </div>

            <div class="post-content" id="post-body">
                ${content}
            </div>

            <div class="share-bar">
                <span>Share:</span>
                <a href="#" class="share-btn">Twitter</a>
                <a href="#" class="share-btn">LinkedIn</a>
            </div>
        </article>

        <section class="comments-section">
            <h2>Comments</h2>
            <div id="comments-list"></div>
        </section>

    </main>

    <div id="toast"></div>

    <!-- Circular SVG progress indicator -->
    <svg id="scroll-progress-ring" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r="28"/>
        <circle class="progress" cx="31" cy="31" r="28" style="transform: rotate(-90deg); transform-origin: 50% 50%;"/>
    </svg>
    <button id="scroll-to-top" title="Back to top" aria-label="Scroll to top">&#8679;</button>

    <footer>
        <p>&copy; 2026 MyBlog. Made with HTML, CSS &amp; JavaScript.</p>
    </footer>

    <script src="js/app.js"></script>
    <script>
        (function () {
            const btn = document.getElementById('scroll-to-top');
            const ring = document.getElementById('scroll-progress-ring');
            const progressCircle = ring ? ring.querySelector('.progress') : null;
            const circumference = 176;
            function updateScroll() {
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const progress = docHeight > 0 ? scrollTop / docHeight : 0;
                if (scrollTop > 300) { btn.classList.add('visible'); ring.classList.add('visible'); }
                else { btn.classList.remove('visible'); ring.classList.remove('visible'); }
                if (progressCircle) progressCircle.style.strokeDashoffset = circumference - progress * circumference;
            }
            window.addEventListener('scroll', updateScroll, { passive: true });
            if (btn) btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        })();
    </script>
</body>

</html>`;
}

// ─── Helper: generate post card HTML ─────────────────────────────────────────
function generatePostCard({ title, category, date, readTime, description, filename }) {
    const formattedDate = formatDate(date);
    return `
                <article class="post-card" data-filename="${filename}">
                    <div class="card-top-row">
                        <span class="category">${category}</span>
                    </div>
                    <h3><a href="${filename}">${title}</a></h3>
                    <p>${description}</p>
                    <div class="post-meta">
                        <span>${formattedDate}</span>
                        <span>${readTime}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-card-action btn-edit" data-file="${filename}" data-title="${title.replace(/"/g, '&quot;')}" title="Edit blog post">✏️ Edit</button>
                        <button class="btn-card-action btn-delete" data-file="${filename}" data-title="${title.replace(/"/g, '&quot;')}" title="Delete blog post">🗑️ Delete</button>
                    </div>
                </article>`;
}

// ─── Helper: remove card from an HTML file ───────────────────────────────────
function removeCardFromFile(filePath, filename) {
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');
    // Regex matches <article ... data-filename="filename">...</article> or <article ... href="filename" ... </article>
    const regex1 = new RegExp(`<article[^>]*data-filename=["']${filename}["'][\\s\\S]*?<\\/article>`, 'gi');
    const regex2 = new RegExp(`<article[^>]*>[\\s\\S]*?href=["']${filename}["'][\\s\\S]*?<\\/article>`, 'gi');
    
    html = html.replace(regex1, '');
    html = html.replace(regex2, '');
    fs.writeFileSync(filePath, html, 'utf8');
}

// ─── Helper: update card in an HTML file ─────────────────────────────────────
function updateCardInFile(filePath, { title, category, date, readTime, description, filename }) {
    if (!fs.existsSync(filePath)) return;
    removeCardFromFile(filePath, filename);
    let html = fs.readFileSync(filePath, 'utf8');
    const MARKER = '<!-- BLOG_CARDS_END -->';
    if (html.includes(MARKER)) {
        const newCard = generatePostCard({ title, category, date, readTime, description, filename });
        html = html.replace(MARKER, newCard + '\n            ' + MARKER);
        fs.writeFileSync(filePath, html, 'utf8');
    }
}

// ─── MIME Types Helper ────────────────────────────────────────────────────────
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // ─── POST /api/publish ───────────────────────────────────────────────────
    if (req.method === 'POST' && req.url === '/api/publish') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { title, category, date, readTime, description, content } = data;

                if (!title || !content) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'Title and content are required.' }));
                }

                let num = 1;
                while (fs.existsSync(path.join(SITE_DIR, `blog${num}.html`))) {
                    num++;
                }
                const filename = `blog${num}.html`;
                const filePath = path.join(SITE_DIR, filename);

                const blogHtml = generateBlogHtml({ title, category, date, readTime, content, filename });
                fs.writeFileSync(filePath, blogHtml, 'utf8');
                console.log(`✅ Created: ${filename}`);

                // Add to blogs.html, home.html, index.html
                const cardFiles = ['blogs.html', 'home.html', 'index.html'];
                cardFiles.forEach(cf => {
                    const fullPath = path.join(SITE_DIR, cf);
                    if (fs.existsSync(fullPath)) {
                        let html = fs.readFileSync(fullPath, 'utf8');
                        const MARKER = '<!-- BLOG_CARDS_END -->';
                        if (html.includes(MARKER)) {
                            const newCard = generatePostCard({ title, category, date, readTime, description, filename });
                            html = html.replace(MARKER, newCard + '\n            ' + MARKER);
                            fs.writeFileSync(fullPath, html, 'utf8');
                            console.log(`✅ Updated ${cf} with "${title}"`);
                        }
                    }
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename, title }));
            } catch (err) {
                console.error('❌ Publish error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ─── POST /api/edit ──────────────────────────────────────────────────────
    if (req.method === 'POST' && req.url === '/api/edit') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { filename, title, category, date, readTime, description, content } = data;

                if (!filename || !title || !content) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'Filename, title, and content are required.' }));
                }

                const filePath = path.join(SITE_DIR, path.basename(filename));
                const blogHtml = generateBlogHtml({ title, category, date, readTime, content, filename: path.basename(filename) });
                fs.writeFileSync(filePath, blogHtml, 'utf8');
                console.log(`✅ Updated post: ${filename}`);

                // Update cards in blogs.html, home.html, index.html
                const cardFiles = ['blogs.html', 'home.html', 'index.html'];
                cardFiles.forEach(cf => {
                    updateCardInFile(path.join(SITE_DIR, cf), { title, category, date, readTime, description, filename: path.basename(filename) });
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename: path.basename(filename), title }));
            } catch (err) {
                console.error('❌ Edit error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ─── POST /api/delete ────────────────────────────────────────────────────
    if (req.method === 'POST' && req.url === '/api/delete') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { filename } = data;

                if (!filename) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'Filename is required for deletion.' }));
                }

                const safeFile = path.basename(filename);
                const filePath = path.join(SITE_DIR, safeFile);

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Deleted file: ${safeFile}`);
                }

                // Remove card from blogs.html, home.html, index.html
                const cardFiles = ['blogs.html', 'home.html', 'index.html'];
                cardFiles.forEach(cf => {
                    removeCardFromFile(path.join(SITE_DIR, cf), safeFile);
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename: safeFile }));
            } catch (err) {
                console.error('❌ Delete error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ─── GET /api/blog-data?file=... ─────────────────────────────────────────
    if (req.method === 'GET' && req.url.startsWith('/api/blog-data')) {
        try {
            const urlParams = new URL(req.url, `http://${req.headers.host}`);
            const filename = urlParams.searchParams.get('file');

            if (!filename) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'File parameter required.' }));
            }

            const safeFile = path.basename(filename);
            const filePath = path.join(SITE_DIR, safeFile);

            if (!fs.existsSync(filePath)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'Blog post not found.' }));
            }

            const html = fs.readFileSync(filePath, 'utf8');

            // Parse metadata from HTML
            const titleMatch = html.match(/<h1>(.*?)<\/h1>/i);
            const categoryMatch = html.match(/<span class=["']category["']>(.*?)<\/span>/i);
            const dateMatch = html.match(/<div class=["']post-meta["']>[\s\S]*?<span>(.*?)<\/span>/i);
            const contentMatch = html.match(/<div class=["']post-content["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<div class=["']share-bar["']>/i);

            const title = titleMatch ? titleMatch[1].trim() : '';
            const category = categoryMatch ? categoryMatch[1].trim() : 'General';
            const date = dateMatch ? dateMatch[1].trim() : '';
            const content = contentMatch ? contentMatch[1].trim() : '';

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                filename: safeFile,
                title,
                category,
                date,
                content
            }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // ─── Static File Server ──────────────────────────────────────────────────
    if (req.method === 'GET') {
        let reqPath = req.url === '/' ? '/index.html' : req.url;
        reqPath = reqPath.split('?')[0];

        let filePath = path.join(SITE_DIR, reqPath);
        
        // If index.html is requested but doesn't exist yet, try home.html
        if (!fs.existsSync(filePath) && (reqPath === '/index.html' || reqPath === '/')) {
            filePath = path.join(SITE_DIR, 'home.html');
        }

        const extname = path.extname(filePath).toLowerCase();

        // Prevent directory traversal
        if (!filePath.startsWith(SITE_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            return res.end('403 Forbidden');
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                }
            } else {
                const contentType = MIME_TYPES[extname] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }
});

server.listen(PORT, () => {
    console.log('');
    console.log('  ✨ MyBlog Publishing Server Running');
    console.log(`  🌐 Home / Index : http://localhost:${PORT}/index.html`);
    console.log(`  📚 All Blogs    : http://localhost:${PORT}/blogs.html`);
    console.log(`  ✍️  Admin/Edit  : http://localhost:${PORT}/admin.html`);
    console.log('');
});
