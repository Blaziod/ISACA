<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// Simple file storage using /tmp directory (Vercel writable)
$dataFile = '/tmp/scanOutList.json';

if ($method === 'GET') {
    // Get scan-out list
    if (file_exists($dataFile)) {
        $data = file_get_contents($dataFile);
        echo $data ?: '[]';
    } else {
        echo '[]';
    }
} elseif ($method === 'POST') {
    // Save scan-out list
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data && is_array($data)) {
        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true, 'message' => 'Data saved successfully']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data format']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
