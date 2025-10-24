function quickViewCubeOverlay(brainCube,dataCube,colorMap,mask)

if nargin<3
    colorMap = [];
    mask=ones(size(dataCube));
end

if nargin<4
    mask=ones(size(dataCube));
end
    
if strcmp(colorMap,'color')
    [colCubeR,colCubeG,colCubeB]=cube2heatmap(dataCube,mask);
end

[a b c] = size(dataCube);

figure('Position', [  318          60        1068         886])
n = ceil(sqrt(c));
for i=1:c
    subplot(n,n,i)
        
    if strcmp(colorMap,'color')
        im(:,:,1)=brainCube(:,:,i)*255 + colCubeR(:,:,i);
        im(:,:,2)=brainCube(:,:,i)*255 + colCubeG(:,:,i);
        im(:,:,3)=brainCube(:,:,i)*255 + colCubeB(:,:,i);
        imshow(im/255);
    else
        imagesc(dataCube(:,:,i), [min(dataCube(:)) max(dataCube(:))]);
    end
    
    axis('equal'), axis('tight'), axis('off')
end

function [colCubeR,colCubeG,colCubeB]=cube2heatmap(cube,mask)

rgbPosU=[255 255 0];
rgbPosL=[255 75 0];
rgbNegL=[0 255 75];
rgbNegU=[0 75 255];

% 2020, attempted to improve color map
rgbPosU=[255 255 0];
rgbPosL=[150 75 0];
rgbNegL=[0 150 75];
rgbNegU=[0 75 255];

% 2020, attempted to improve color map
rgbPosU=[255 255 0];
rgbPosL=[243 193 121]/1.5;
rgbNegL=[192 211 255]/1.5;
rgbNegU=[0 75 255];

oldCube=cube;

% color cube
colCubeR=zeros(size(cube));
colCubeG=zeros(size(cube));
colCubeB=zeros(size(cube));


% set negative colors
cube=oldCube;
negIDX=find(cube<0);
posIDX=find(cube>0);
cube(posIDX)=0;
cube=abs(cube);
sf=.50; %(std(cube(negIDX))*2);
idx=negIDX;

cubeR=(cube-min(cube(:)));
cubeR=cubeR/sf;
cubeR(cubeR>1)=1;
colCubeR(idx)=colCubeR(idx)+(cubeR(idx)*rgbNegU(1)+(1-cubeR(idx))*rgbNegL(1)).*mask(idx);

cubeG=(cube-min(cube(:)));
cubeG=cubeG/sf;
cubeG(cubeG>1)=1;
colCubeG(idx)=colCubeG(idx)+(cubeG(idx)*rgbNegU(2)+(1-cubeG(idx))*rgbNegL(2)).*mask(idx);

cubeB=(cube-min(cube(:)));
cubeB=cubeB/sf;
cubeB(cubeB>1)=1;
colCubeB(idx)=colCubeB(idx)+(cubeB(idx)*rgbNegU(3)+(1-cubeB(idx))*rgbNegL(3)).*mask(idx);

% set positive colors
cube=oldCube;
cube(negIDX)=0;
sf=.50; %(std(cube(posIDX))*2);
idx=posIDX;

cubeR=(cube-min(cube(:)));
cubeR=cubeR/sf;
cubeR(cubeR>1)=1;
colCubeR(idx)=colCubeR(idx)+(cubeR(idx)*rgbPosU(1)+(1-cubeR(idx))*rgbPosL(1)).*mask(idx);

cubeG=(cube-min(cube(:)));
cubeG=cubeG/sf;
cubeG(cubeG>1)=1;
colCubeG(idx)=colCubeG(idx)+(cubeG(idx)*rgbPosU(2)+(1-cubeG(idx))*rgbPosL(2)).*mask(idx);

cubeB=(cube-min(cube(:)));
cubeB=cubeB/sf;
cubeB(cubeB>1)=1;
colCubeB(idx)=colCubeB(idx)+(cubeB(idx)*rgbPosU(3)+(1-cubeB(idx))*rgbPosL(3)).*mask(idx);



