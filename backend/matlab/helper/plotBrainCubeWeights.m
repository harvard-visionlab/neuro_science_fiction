function plotBrainCubeWeights(r,f,featureNames)

close all;
aveBC=[];
aveDC=[];
maxR = [];
for subnum=1:length(r)
    idx=r{subnum}.whichVoxels;
    usedVoxels=r{subnum}.usedVoxels;
    brainCube = zeros(r{subnum}.brainSize);
    brainCube(usedVoxels)=.15;
    dataCube = zeros(r{subnum}.brainSize);    
    dataCube(usedVoxels(idx)) = r{subnum}.betaAve(f+1,:);
    aveBC(:,:,:,subnum)=brainCube;
    aveDC(:,:,:,subnum)=dataCube;
    maxR = [maxR, max(r{subnum}.betaAve(2:end))];
    %quickViewCubeOverlay(brainCube,dataCube,'color')
end
maxR = mean(maxR);
aveBC = mean(aveBC,4);
aveDC = sum(aveDC,4);
quickViewCubeOverlay(aveBC,aveDC,'color');
%quickViewCubeOverlay(aveBC,aveDC);
set(gcf,'Name',sprintf('%s',featureNames{f}));