function quickViewCube(cube)

%cube = shiftdim(cube,1);

[a b c] = size(cube);

minCube = min(cube(:));
maxCube = max(cube(:));

figure('Position', [  318          60        1068         886])
n = ceil(sqrt(c));
for i=1:c
    subplot(n,n,i)
    imagesc(cube(:,:,i), [minCube maxCube]);
    axis('equal'), axis('tight'), axis('off')
    
end
