<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://isaca.idcode.ng');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Data storage directory
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Get the endpoint from the URL
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);

// Remove '/api/' from the beginning of the path
$path = str_replace('/api/', '', $path);
$path = str_replace('/api', '', $path);
$pathParts = explode('/', trim($path, '/'));

$endpoint = $pathParts[0] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Debug logging (remove in production)
error_log("API Request - Method: $method, Endpoint: $endpoint, Full Path: $path");

// Helper function to get file path
function getDataFile($key) {
    global $dataDir;
    $allowedKeys = ['registeredUsers', 'scanInList', 'scanOutList'];
    if (!in_array($key, $allowedKeys)) {
        throw new Exception('Invalid data key');
    }
    return $dataDir . '/' . $key . '.json';
}

// Helper function to read data
function readData($key) {
    $file = getDataFile($key);
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    return json_decode($content, true) ?: [];
}

// Helper function to write data
function writeData($key, $data) {
    $file = getDataFile($key);
    $json = json_encode($data, JSON_PRETTY_PRINT);
    return file_put_contents($file, $json) !== false;
}

try {
    switch ($endpoint) {
        case 'health':
            if ($method === 'GET') {
                echo json_encode(['status' => 'ok', 'timestamp' => time()]);
            }
            break;

        case 'registeredUsers':
        case 'scanInList':
        case 'scanOutList':
            if ($method === 'GET') {
                $data = readData($endpoint);
                echo json_encode($data);
            } elseif ($method === 'POST') {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);
                
                if ($data === null) {
                    throw new Exception('Invalid JSON data');
                }
                
                if (writeData($endpoint, $data)) {
                    echo json_encode(['success' => true, 'message' => 'Data saved']);
                } else {
                    throw new Exception('Failed to save data');
                }
            }
            break;

        case 'clear':
            if ($method === 'DELETE') {
                $keys = ['registeredUsers', 'scanInList', 'scanOutList'];
                $cleared = 0;
                
                foreach ($keys as $key) {
                    $file = getDataFile($key);
                    if (file_exists($file) && unlink($file)) {
                        $cleared++;
                    }
                }
                
                echo json_encode(['success' => true, 'cleared' => $cleared]);
            }
            break;

        case 'backup':
            if ($method === 'GET') {
                $backup = [];
                $keys = ['registeredUsers', 'scanInList', 'scanOutList'];
                
                foreach ($keys as $key) {
                    $backup[$key] = readData($key);
                }
                
                $filename = 'backup_' . date('Y-m-d_H-i-s') . '.json';
                header('Content-Disposition: attachment; filename="' . $filename . '"');
                echo json_encode($backup, JSON_PRETTY_PRINT);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
